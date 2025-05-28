import * as vscode from 'vscode';
import { CodeGenieViewProvider } from "./CodeGenieViewProvider";
import { codegenieAPI } from './codegenie-ui/src/api';

const debugOutputChannel = vscode.window.createOutputChannel("CodeGenie Debug");
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
        // Extract code blocks if presentu
        const codeBlockRegex = /```(?:[\w]*)\n([\s\S]*?)```/g;
        let match;
        const codeBlocks = [];

        while ((match = codeBlockRegex.exec(response)) !== null) {
            codeBlocks.push(match[1].trim());
        }

        if (codeBlocks.length > 0) {
            return codeBlocks.join('\n\n');
        }

        // Fallback: simple filtering
        return response
            .split('\n')
            .map(line => line.trim())
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
            const rawResponse = await codegenieAPI.generate(prompt);
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

            vscode.window.showInformationMessage("✅ Code inserted!");
            updateStatusBar();
        } catch (error) {
            vscode.window.showErrorMessage(`Error generating code: ${error}`);
            statusBarItem.text = "$(error) CodeGenie: Error";
        }
    }

    function findLastComment(document: vscode.TextDocument): string | null {
        const languageId = document.languageId;

        const commentPatterns: Record<string, RegExp> = {
            'python': /^\s*#(.*)/,
            'javascript': /^\s*\/\/(.*)/,
            'typescript': /^\s*\/\/(.*)/,
            'cpp': /^\s*\/\/(.*)/,
            'c': /^\s*\/\/(.*)/,
            'html': /^\s*<!--(.*)-->/
        };

        const pattern = commentPatterns[languageId];
        if (!pattern) return null;

        for (let i = document.lineCount - 1; i >= 0; i--) {
            const text = document.lineAt(i).text;
            const match = text.match(pattern);
            if (match) return match[1].trim();
        }

        return null;
    }

    function updateStatusBar() {
        statusBarItem.text = EXTENSION_STATUS ? "$(check) CodeGenie: Ready" : "$(x) CodeGenie: Disabled";
    }

    // Commands
    let generateCode = vscode.commands.registerCommand('codegenie.getCode', async () => {
        if (!EXTENSION_STATUS) {
            vscode.window.showErrorMessage("Codegenie is disabled.");
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
            vscode.window.showErrorMessage("Codegenie is disabled.");
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

    let enable = vscode.commands.registerCommand('codegenie.enable', () => {
        EXTENSION_STATUS = true;
        vscode.window.showInformationMessage("✅ CodeGenie Enabled");
        updateStatusBar();
    });

    let disable = vscode.commands.registerCommand('codegenie.disable', () => {
        EXTENSION_STATUS = false;
        vscode.window.showWarningMessage("CodeGenie Disabled");
        updateStatusBar();
    });

    let triggerInlineCompletion = vscode.commands.registerCommand('codegenie.triggerInlineCompletion', async () => {
        inlineSuggestionRequested = true;
        await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
    });

    let debugSelectedCode = vscode.commands.registerCommand('codegenie.debugSelectedCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!EXTENSION_STATUS) {
            vscode.window.showErrorMessage("CodeGenie is disabled.");
            return;
        }
        if (!editor) {
            vscode.window.showErrorMessage('Open a file to use CodeGenie.');
            return;
        }
        const selection = editor.selection;
        const code = editor.document.getText(selection);
        if (!code.trim()) {
            vscode.window.showWarningMessage('Please select some code to debug.');
            return;
        }
        statusBarItem.text = "$(sync~spin) CodeGenie: Debugging...";

        try {
            const result = await codegenieAPI.debug(code); 
            debugOutputChannel.clear();
            if (result) {
                vscode.window.showInformationMessage(result);
                debugOutputChannel.appendLine(result);
                debugOutputChannel.show(true);
                statusBarItem.text = "$(check) CodeGenie: Ready";
            } else {
                debugOutputChannel.appendLine("No debug info received.");
                debugOutputChannel.show(true);
                statusBarItem.text = "$(alert) CodeGenie: No response";
            }
        } catch (error) {
            debugOutputChannel.appendLine(`Error debugging code: ${error instanceof Error ? error.message : String(error)}`);
            debugOutputChannel.show(true);
            statusBarItem.text = "$(error) CodeGenie: Error";
        }
    });

    let explainSelectedCode = vscode.commands.registerCommand('codegenie.explainCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!EXTENSION_STATUS) {
            vscode.window.showErrorMessage("CodeGenie is disabled.");
            return;
        }
        if (!editor) {
            vscode.window.showErrorMessage('Open a file to use CodeGenie.');
            return;
        }
        const selection = editor.selection;
        const code = editor.document.getText(selection);
        if (!code.trim()) {
            vscode.window.showWarningMessage('Please select some code to explain.');
            return;
        }

        // Optionally reveal or focus the CodeGenie view container
        await vscode.commands.executeCommand('workbench.view.extension.codegenieViewContainer');

        // Send the selected code to the webview via provider
        provider.postMessage({
            type: 'explainCode',
            code: code
        });
    });

    let improveSelectedCode = vscode.commands.registerCommand('codegenie.improveCode', async () => {
        if (!EXTENSION_STATUS) {
            vscode.window.showErrorMessage("CodeGenie is disabled.");
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Open a file to use CodeGenie.');
            return;
        }
        const selection = editor.selection;
        const code = editor.document.getText(selection);
        if (!code.trim()) {
            vscode.window.showWarningMessage('Please select some code to improve.');
            return;
        }
        statusBarItem.text = "$(sync~spin) CodeGenie: Improving...";
        try {
            // Use the centralized API
            const improved = await codegenieAPI.improve(code);

            if (!improved || improved.trim() === code.trim()) {
                vscode.window.showInformationMessage('No improvements suggested.');
                statusBarItem.text = "$(check) CodeGenie: Ready";
                return;
            }

            debugOutputChannel.clear();
            debugOutputChannel.appendLine("---- Improved Code ----\n" + improved);
            debugOutputChannel.show(true);
            vscode.window.showInformationMessage('Improved code displayed in Output Console.');

            statusBarItem.text = "$(check) CodeGenie: Ready";
        } catch (error) {
            vscode.window.showErrorMessage(`Error improving code: ${error instanceof Error ? error.message : String(error)}`);
            statusBarItem.text = "$(error) CodeGenie: Error";
        }
    });

    context.subscriptions.push(generateCode, generateFromComment, triggerInlineCompletion, explainSelectedCode, improveSelectedCode, debugSelectedCode, enable, disable);

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
                let rawResponse = await codegenieAPI.generate(textBeforeCursor);
                let cleanedResponse = removeQueryFromResponse(rawResponse, textBeforeCursor);
                let aiResponse = extractOnlyCode(cleanedResponse);

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
