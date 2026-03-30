import os from 'os';
import path from 'path';
import { isDir, exists } from '../../util/fileutil';
import { readdir, readdirSync } from 'fs';
import { SkillInfo } from '../../config/skill';
import { parse } from '../../config/markdown';

let skills:Map<string, SkillInfo> = new Map();

export async function initSkill(){
    const homeDir = os.homedir();
    try{
        const skillFolder = path.join(homeDir, '.agents', 'skills');
        if (!isDir(skillFolder)){
            return;
        }
        const items = readdirSync(skillFolder, { withFileTypes: true });
        for (const item of items) {
            try{
                const fullPath = path.join(skillFolder, item.name, 'SKILL.md');
                if (await exists(fullPath)){
                    const md = await parse(fullPath);
                    const skill:SkillInfo = {
                        name: md.data.name,
                        description: md.data.description,
                        content: md.content,
                        location: fullPath
                    }
                    skills.set(md.data.name, skill);
                }
            }catch(err1){
                console.error(`解析skill文件${item.name}出错`, err1)
            }
            
        }
    }catch(err){
        console.error(`解析skills出错`, err)
    }
}

export function all(){
    return Array.from(skills.values());
}

export function findSkill(name:string){
    return skills.get(name);
}
 
// 参考opencode的实现
export function getSkillsInfo(accessibleSkills:SkillInfo[]){
    const description = accessibleSkills.length === 0
      ? "Load a specialized skill that provides domain-specific instructions and workflows. No skills are currently available."
      : [
          "Load a specialized skill that provides domain-specific instructions and workflows.",
          "",
          "When you recognize that a task matches one of the available skills listed below, use this tool to load the full skill instructions.",
          "",
          "The skill will inject detailed instructions, workflows, and access to bundled resources (scripts, references, templates) into the conversation context.",
          "",
          'Tool output includes a `<skill_content name="...">` block with the loaded content.',
          "",
          "The following skills provide specialized sets of instructions for particular tasks",
          "Invoke this tool to load a skill when a task matches one of the available skills listed below:",
          "",
          "<available_skills>",
          ...accessibleSkills.flatMap((skill) => [
            `  <skill>`,
            `    <name>${skill.name}</name>`,
            `    <description>${skill.description}</description>`,
            `    <location>${skill.location}</location>`,
            `  </skill>`,
          ]),
          "</available_skills>",
        ].join("\n")

  const examples = accessibleSkills
    .map((skill) => `'${skill.name}'`)
    .slice(0, 3)
    .join(", ")
  const hint = examples.length > 0 ? ` (e.g., ${examples}, ...)` : ""
  return {description, examples, hint};
}