#!/usr/bin/env node
import { cac } from 'cac';
import { registerGitCommand } from './git';

const cli = cac('light-brain');

registerGitCommand(cli);

// 增加兜底逻辑
cli.on('command:*', () => {
  console.error('❌ 未知命令: %s', cli.args.join(' '));
  cli.help();
  process.exit(1);
});  

cli.help(helps=>{
  return [
    {title:'git-commit',body:'git文件提交命令，用大模型辅助生成提交信息，参数有效能任务ID:-taskId T12345'}
  ]
});
 cli.parse();