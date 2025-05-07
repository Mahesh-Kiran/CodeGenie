import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export class CodeGenieViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "codegenieView";
  public _view?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) { }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, "src", "codegenie-ui", "build")),
      ],
    };

    const webviewDistPath = path.join(this.context.extensionPath, "src", "codegenie-ui", "build");
    const indexPath = path.join(webviewDistPath, "index.html");

    try {
      let html = fs.readFileSync(indexPath, "utf8");

      if (!html.includes('Content-Security-Policy')) {
        html = html.replace(
          /<head>/i,
          `<head>
            <meta http-equiv="Content-Security-Policy" 
                  content="default-src 'none'; 
                          connect-src http://127.0.0.1:8000 vscode-resource:; 
                          img-src vscode-resource: https:; 
                          script-src vscode-resource: 'unsafe-inline'; 
                          style-src vscode-resource: 'unsafe-inline'; 
                          font-src vscode-resource:;">
          `
        );
      }

      html = html.replace(/(src|href)="(?!https?:\/\/)(.*?)"/g, (match, attr, src) => {
        const resourceUri = webviewView.webview.asWebviewUri(
          vscode.Uri.file(path.join(webviewDistPath, src))
        );
        return `${attr}="${resourceUri}"`;
      });

      webviewView.webview.html = html;
    } catch (error: any) {
      console.error("❌ Failed to load Webview:", error);
      webviewView.webview.html = `<h1>Error loading UI</h1><p>${error.message}</p>`;
    }

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "insertCode") {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage("No active editor.");
          return;
        }
    
        // Focus without changing cursor
        await vscode.window.showTextDocument(editor.document, editor.viewColumn);
        
        // Get fresh reference
        editor = vscode.window.activeTextEditor;
        if (!editor) return;
    
        // Insert code
        await editor.edit(editBuilder => {
          editBuilder.insert(editor!.selection.active, message.code);
        });
      }
    });    

  }
}
