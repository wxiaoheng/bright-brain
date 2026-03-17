import { CAC} from 'cac';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { randomUUID } from 'node:crypto';

import simpleGit, {SimpleGit} from 'simple-git';
import {format} from 'util';


const API_URL = "http://127.0.0.1:3690/api/git/summary"

const TEMPLATE = '[任务编号]:%s \n[修改说明]:%s';

export function registerGitCommand(cli:CAC){
   cli.command('commit', 'AI 辅助生成 Git 提交信息')
  .allowUnknownOptions()
  .option('--taskId <id>', '效能任务ID')
  .option('--y', '无需确认')
  .action(async (...args) => {
    try {
      console.log(args);
      const pwd = process.cwd();
      console.log(`当前目录：${pwd}`);
      const {taskId, y} = args[0];
      if (!taskId || taskId.length===0){
        console.error(chalk.red('🔴 执行失败:'), '效能平台任务taskId不能为空');
        return;
      }  

      const git = simpleGit(pwd);
      const isRepo = await git.checkIsRepo();
      console.log(isRepo);
      if (!isRepo) {
          console.error(chalk.red('❌ 当前目录不是一个 Git 仓库'));
          return;
      }

      await git.add(['-u']);
      
      const spinner = ora('正在生成提交说明...'); 
      spinner.text = '等待 AI 生成提交信息 (可能需要几秒钟)...';
      spinner.color = 'cyan';
      spinner.start(); // 🚀 启动旋转动画

      let summary = await getAISummary(taskId, pwd);
      spinner.succeed('AI 生成完毕！');

      if (!y){
        console.log('\n' + chalk.gray('----------------------------------------'));
        console.log(chalk.bold('📝 AI 建议提交信息：'));
        console.log(chalk.cyan(summary));
        console.log(chalk.gray('----------------------------------------') + '\n');
  
        // 4. 交互确认 (使用 inquirer)
        const { action } = await inquirer.prompt([
          {
            type: 'select',
            name: 'action',
            message: '请确认操作:',
            choices: [
              { name: '✅ 确认提交', value: 'submit' },
              { name: '✏️  编辑信息', value: 'edit' },
              { name: '❌ 取消', value: 'cancel' }
            ]
          }
        ]);
  
        if (action === 'edit') {
          const { newMessage } = await inquirer.prompt([
            {
              type: 'editor',
              name: 'newMessage',
              message:'请编辑提交信息',
              default:summary,
            }
          ]);
          if (newMessage){
            summary = newMessage;
            console.log('\n' + chalk.gray('----------------------------------------'));
            console.log(chalk.bold('📝 修改后提交信息：'));
            console.log(chalk.cyan(newMessage));
            console.log(chalk.gray('----------------------------------------') + '\n');
          }
        } else if (action == 'cancel'){
          summary = '';
          console.log(chalk.gray('已取消'));
        }
      }
      if (summary?.length){
        console.log(chalk.blue('🚀 正在提交...'));
        const msg = format(TEMPLATE, taskId, summary);
        await git.commit(msg);
        console.log(chalk.green('✅ 提交成功！'));
      }

    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.error(chalk.red('🔴 错误：Light-Brain 桌面端未启动'));
      } else {
        console.error(chalk.red('🔴 执行失败:'), error.message);
      }
      process.exit(1);
    }
  });
}


async function getAISummary(taskId:string, pwd:string){
  const sessionId = randomUUID();
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      taskId,
      pwd,
      sessionId
    })
  });
  if (res.ok){
    const json = await res.json();
    return json.summary;
  }
  const json = await res.json();
  throw new Error(json.details);
}