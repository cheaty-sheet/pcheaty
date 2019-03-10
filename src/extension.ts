import * as vscode from 'vscode';
import CheatyPreviewer from './CheatyPreviewer';

export function activate(context: vscode.ExtensionContext) {
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('extension.pcheaty', () => {
		const editor = vscode.window.activeTextEditor;
		
		if (editor) {
			const previewer = new CheatyPreviewer();
			previewer.render(editor);
			previewer.listen();
		} else {
			vscode.window.showErrorMessage('There is no editor opened.');
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
