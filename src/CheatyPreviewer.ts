import * as vscode from 'vscode';
import { parsers, renderers } from '@cheaty-sheet/cheaty';
import * as path from 'path';
import { homedir } from 'os';
import { writeFileSync } from 'fs';

export default class CheatyPreviewer {

	private _parser: any;
	private _renderer: any;
	private _uri: vscode.Uri;
	private _panel: vscode.WebviewPanel;

	constructor() {
		this._parser = new parsers.YMLParser();
		this._renderer = new renderers.HTMLRenderer();
		this._uri = vscode.Uri.file(path.resolve(homedir(), 'cheaty.html'));
		this._panel = vscode.window.createWebviewPanel(
			'cheaty-preview',
			'Cheaty Preview',
			vscode.ViewColumn.Two,
			{ enableScripts: true }
		);
	}
	
	public async render(editor: vscode.TextEditor | undefined) {
		if (editor) {
			try {
				const output = await this.computeOutput(editor);
				this._panel.webview.html = this.generateSaveButton() + output;
			} catch ({ message }) {
				this._panel.webview.html = this.wrapMessage(message);
			}
		}
	}

	public listen() {
		const subscriptionOnChange = vscode.window.onDidChangeTextEditorSelection(async () => {
			await this.render(vscode.window.activeTextEditor);
		});

		const subscriptionOnSave = this._panel.webview.onDidReceiveMessage((message) => {			
			if (message.command === 'pcheaty-save') {
				const editor = vscode.window.visibleTextEditors[0];
				
				if (editor) {
					this.saveContent(editor);
				}
			}
		});

		this._panel.onDidDispose(() => {
			subscriptionOnChange.dispose();
			subscriptionOnSave.dispose();
		});
	}

	private async computeOutput(editor: vscode.TextEditor): Promise<string> {		
		const cheatyContent = editor.document.getText();
		
		try {
			const sheet  = await this._parser.parseFromString(cheatyContent);
			const render = await this._renderer.render(sheet);

			return render.toString();
		} catch (e) {
			const stack = String(e.stack);
			const isYamlException = stack.startsWith('YAMLException');

			if (isYamlException) {
				const firstLine = stack.split('\n')[0];
				const readableError = firstLine.substring(0, firstLine.length-1) + '.';
				throw new Error(readableError);
			}

			throw new Error(`
				This code cannot parsed as a Cheaty sheet. <br>
				Examples can be found at 
				<a href="https://github.com/cheaty-sheet/Cheaty">https://github.com/cheaty-sheet/Cheaty</a>
			`);
		}
	}

	private async saveContent(editor: vscode.TextEditor) {
		const uri = await vscode.window.showSaveDialog({
			defaultUri: this._uri,
			filters: { 'Cheaty sheets': ['html'] }
		});

		if (uri) {
			const contentToSave = await this.computeOutput(editor);
			writeFileSync(uri.fsPath, contentToSave);
			this._uri = uri;
		}
	}

	private generateSaveButton(): string {		
		return `
			<style>
				body { color: inherit !important; }

				#pcheaty-save {
					margin: 10px auto;
					padding: 5px;
					background-color: #00BF5F;
					color: #fff;
					border: none;
					border-radius: 1.2em;
				}

				#pcheaty-save:hover { cursor: pointer; }
				#pcheaty-save:focus { outline: 0; }
			</style>

			<button id="pcheaty-save" type="button">Save</button>

			<script>
				(function() {
					const vscode = acquireVsCodeApi();
					const saveButton = document.getElementById('pcheaty-save');
		
					saveButton.addEventListener('click', () => 
						vscode.postMessage({
							command: 'pcheaty-save'
						})
					);
				}());
			</script>
		`;
	}

	private wrapMessage(message: string): string {
		return `<!DOCTYPE html>
			<html lang="en">
				<head><meta charset="UTF-8"></head>
				<body>${message}</body>
			</html>`;
	}
	
}
