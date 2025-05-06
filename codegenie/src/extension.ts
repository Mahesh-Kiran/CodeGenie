import * as vscode from 'vscode';
import { CodeGenieViewProvider } from "./CodeGenieViewProvider";
import { fetchAICompletion } from "./codegenie-ui/src/api";

const API_URL = "http://127.0.0.1:8000/generate";
let EXTENSION_STATUS = true;
let inlineSuggestionRequested = false;
let statusBarItem: vscode.StatusBarItem;
let provider: CodeGenieViewProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log("✅ CodeGenie Extension Activated!");

    provider = new CodeGenieViewProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(CodeGenieViewProvider.viewType, provider)
    );

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    updateStatusBar();
    statusBarItem.show();

    function removeQueryFromResponse(response: string, query: string): string {
        const trimmedQuery = query.trim();
        let cleaned = response.trim();

        if (cleaned.startsWith(trimmedQuery)) {
            cleaned = cleaned.slice(trimmedQuery.length).trimStart();
            if (cleaned.startsWith('\n')) {
                cleaned = cleaned.slice(1);
            }
        }
        return cleaned;
    }

    function extractOnlyCode(response: string): string {
        let cleaned = response
            .split('\n')
            .map(line => line.trim())
            .filter(line => line !== '.' && line !== '')
            .join('\n')
            .trim();

        const codeBlocks = [];
        const codeBlockRegex = /``````/g;
        let match;
        while ((match = codeBlockRegex.exec(cleaned)) !== null) {
            codeBlocks.push(match[1].trim());
        }

        if (codeBlocks.length > 0) {
            return codeBlocks.join('\n\n');
        }

        return cleaned
            .split('\n')
            .filter(line =>
                line &&
                !line.startsWith('#') &&
                !line.startsWith('//') &&
                !/^(Note|This|Explanation|For example|A more efficient solution|Here is|In this|To solve)/i.test(line)
            )
            .join('\n')
            .trim();
    }


    async function generateCodeFromPrompt(editor: vscode.TextEditor, prompt: string) {
        vscode.window.showInformationMessage("✨ Generating Code...");
        statusBarItem.text = "$(sync~spin) CodeGenie: Generating...";

        try {
            const rawResponse = await fetchAICompletion(prompt, API_URL, 1000);
            const cleanedResponse = removeQueryFromResponse(rawResponse, prompt);
            const aiResponse = extractOnlyCode(cleanedResponse);


            if (!aiResponse) {
                vscode.window.showErrorMessage("No code generated.");
                statusBarItem.text = "$(alert) CodeGenie: No response";
                return;
            }

            editor.edit(editBuilder => {
                editBuilder.insert(editor.selection.active, `\n${aiResponse.trim()}\n`);
            });

            // Send full explanation + code to Webview
            if (provider && provider._view) {
                provider._view.webview.postMessage({
                    type: "aiResponse",
                    content: rawResponse
                });
            }

            vscode.window.showInformationMessage("✅ Code inserted!");
            updateStatusBar();
        } catch (error) {
            vscode.window.showErrorMessage(`Error generating code: ${error}`);
            statusBarItem.text = "$(error) CodeGenie: Error";
        }
    }

    function findLastComment(document: vscode.TextDocument): string | null {
        for (let i = document.lineCount - 1; i >= 0; i--) {
            const text = document.lineAt(i).text.trim();
            if (text.startsWith("//") || text.startsWith("#")) {
                return text.replace(/^[/#]+/, "").trim();
            }
        }
        return null;
    }

    function updateStatusBar() {
        statusBarItem.text = EXTENSION_STATUS ? "$(check) CodeGenie: Ready" : "$(x) CodeGenie: Disabled";
    }

    // Commands
    let generateCode = vscode.commands.registerCommand('codegenie.getCode', async () => {
        if (!EXTENSION_STATUS) {
            vscode.window.showErrorMessage("Autocomplete is disabled.");
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Open a file to use CodeGenie.');
            return;
        }

        const prompt = await vscode.window.showInputBox({ prompt: 'Enter your AI prompt' });
        if (!prompt) return;

        await generateCodeFromPrompt(editor, prompt);
    });

    let generateFromComment = vscode.commands.registerCommand('codegenie.generateFromComment', async () => {
        if (!EXTENSION_STATUS) {
            vscode.window.showErrorMessage("Autocomplete is disabled.");
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Open a file to use CodeGenie.');
            return;
        }

        const document = editor.document;
        const lastComment = findLastComment(document);
        if (!lastComment) {
            vscode.window.showErrorMessage("No comment found.");
            return;
        }
        await generateCodeFromPrompt(editor, lastComment);
    });

    let enableAutocomplete = vscode.commands.registerCommand('codegenie.enableAutocomplete', () => {
        EXTENSION_STATUS = true;
        vscode.window.showInformationMessage("✅ CodeGenie Autocomplete Enabled");
        updateStatusBar();
    });

    let disableAutocomplete = vscode.commands.registerCommand('codegenie.disableAutocomplete', () => {
        EXTENSION_STATUS = false;
        vscode.window.showWarningMessage("CodeGenie Autocomplete Disabled");
        updateStatusBar();
    });

    let triggerInlineCompletion = vscode.commands.registerCommand('codegenie.triggerInlineCompletion', async () => {
        inlineSuggestionRequested = true;
        await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
    });
    context.subscriptions.push(generateCode, generateFromComment,triggerInlineCompletion, enableAutocomplete, disableAutocomplete);

    const inlineProvider: vscode.InlineCompletionItemProvider = {
        provideInlineCompletionItems: async (
            document: vscode.TextDocument,
            position: vscode.Position,
            context: vscode.InlineCompletionContext,
            token: vscode.CancellationToken
        ): Promise<vscode.InlineCompletionItem[]> => {
            if (!EXTENSION_STATUS) return [];
            if (!inlineSuggestionRequested) return [];
            inlineSuggestionRequested = false; 

            let textBeforeCursor = document.getText(new vscode.Range(position.with(undefined, 0), position)).trim();
            if (!textBeforeCursor) {
                for (let line = position.line - 1; line >= 0; line--) {
                    let prevLineText = document.lineAt(line).text.trim();
                    if (prevLineText.length > 0) {
                        textBeforeCursor = prevLineText;
                        break;
                    }
                }
            }

            if (!textBeforeCursor) return [];

            try {
                console.log("🔵 Autocomplete for:", textBeforeCursor);
                statusBarItem.text = "$(sync~spin) CodeGenie: Generating...";

                let rawResponse = await fetchAICompletion(textBeforeCursor, API_URL, 1000);
                let aiResponse = removeQueryFromResponse(rawResponse, textBeforeCursor);
                if (!aiResponse || aiResponse.trim() === "") {
                    statusBarItem.text = "$(alert) CodeGenie: No response";
                    return [];
                }

                statusBarItem.text = "$(check) CodeGenie: Ready";

                return [
                    new vscode.InlineCompletionItem(
                        new vscode.SnippetString(`\n${aiResponse}`),
                        new vscode.Range(position, position)
                    )
                ];
            } catch (error) {
                console.error("Autocomplete Error:", error);
                statusBarItem.text = "$(error) CodeGenie: Error";
                return [];
            }
        }
    };

    vscode.languages.registerInlineCompletionItemProvider({ pattern: "**" }, inlineProvider);

}

export function deactivate() {
    console.log("🛑 CodeGenie Extension Deactivated");
    statusBarItem.dispose();
}
