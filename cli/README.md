这是一个独立的命令行工具，主要是定义命令及其前置逻辑，然后通过http请求发送到electron端进行处理
目前只有一个git提交命令 bb commit --taskId=xxx
1. 确保electron主程序已启动
2. 执行npm run setup将bb命令添加到系统命令中
3. 后续如果有修改可以执行npm run dev命令实时查看效果