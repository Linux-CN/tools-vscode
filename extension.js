const vscode = require('vscode');
const { Range } = require('vscode');
const { exec } = require("child_process");
const axios = require("axios").default;
const printf = require("fast-printf").printf;

const os = require("os");
let command = os.platform() === 'win32'  ?`start`:"open"

function activate(context) {
	const template = "<<<<<<<\r\n %2$s \r\n=======\r\n %1$s \r\n>>>>>>>";

	let completionRequest = async function (content) {
		let data = JSON.stringify({
			"source": content
		});

		let config = {
			maxBodyLength: Infinity,
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			}
		};
		return await axios.post(`${host}/api/v1/completions`, data, config);
	}

	let translateSelection = vscode.commands.registerCommand("lctt.translate_selection", async function () {
		const editor = vscode.window.activeTextEditor;
		const text = editor.document.getText(editor.selection);
		const { token, host } = vscode.workspace.getConfiguration('lctt');

		if(token == ""){
			vscode.window.showErrorMessage("尚未设置 Token，请设置 Token 后重试","获取并设置 Token").then(result => {
				if(result == "获取并设置 Token"){
					exec(`${command} ${host}/vscode/login`);
				}else {

				}
			});
			return;
		}

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "AI 翻译中..."
		}, async (progress) => {
			try {
				let response = await completionRequest(text);
				let { target, token } = response.data.data;
				editor.edit(editBuilder => {
					editBuilder.replace(editor.selection, printf(template, target, text));
				})
				progress.report({ increment: 100, message: "处理成功" })

				vscode.window.showInformationMessage(`翻译成功，本次消耗 ${token} 个 Token`);
			} catch (error) {
				if (error.response.status == 402) {
					vscode.window.showErrorMessage("翻译失败，你的 Token 不足，请先手动翻译文章，文章被确认后，自动增加 Token。");
				}
				if (error.response.status == 403) {
					vscode.window.showErrorMessage("翻译失败，你的 Token 权限不足，请前往后台添加 completion:create 权限。");
				}
				progress.report({ increment: 100, message: "" })
			}
		})

	})
	context.subscriptions.push(translateSelection);


	let translateAll = vscode.commands.registerCommand("lctt.translate_all", function () {
		const editor = vscode.window.activeTextEditor;
		const text = editor.document.getText();
		const { token, host } = vscode.workspace.getConfiguration('lctt');
		let fullPageRange = new Range(editor.document.lineAt(0).range.start, editor.document.lineAt(editor.document.lineCount - 1).range.end)

		if(token == ""){
			vscode.window.showErrorMessage("尚未设置 Token，请设置 Token 后重试","获取并设置 Token").then(result => {
				if(result == "获取并设置 Token"){
					exec(`${command} ${host}/vscode/login`);
				}else {

				}
			});
			return;
		}

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "AI 翻译中..."
		}, async (progress) => {
			try {
				let response = await completionRequest(text);
				let { target, token } = response.data.data;
				editor.edit(editBuilder => {
					editBuilder.replace(fullPageRange, printf(template, target, text));
				})
				progress.report({ increment: 100, message: "✅ 处理成功" })

				vscode.window.showInformationMessage(`✅ 翻译成功，本次消耗 ${token} 个 Token`);
			} catch (error) {
				console.error(error)
				if (error.response.status == 402) {
					vscode.window.showErrorMessage("翻译失败，你的 Token 不足，请先手动翻译文章，文章被确认后，自动增加 Token。", { modal: true });
				}
				if (error.response.status == 403) {
					vscode.window.showErrorMessage("翻译失败，你的 Token 权限不足，请前往后台添加 completion:create 权限。", { modal: true },);
				}
				progress.report({ increment: 100, message: "" })
			}
		})
	})
	context.subscriptions.push(translateAll);

}

function deactivate() { }

module.exports = {
	activate,
	deactivate
}
