import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export async function PreCompact(context) {
  const coursesDir = join(process.cwd(), 'courses');
  
  if (!existsSync(coursesDir)) {
    return;
  }
  
  const courseDirs = [];
  const entries = await readdir(coursesDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const coursePath = join(coursesDir, entry.name);
      const courseMd = join(coursePath, 'COURSE.md');
      
      if (existsSync(courseMd)) {
        const content = readFileSync(courseMd, 'utf-8');
        
        const titleMatch = content.match(/# 📚 Course: (.+)/);
        const topic = titleMatch ? titleMatch[1] : entry.name;
        
        const statusMatch = content.match(/\| (\d+) \| .+ \| (⬜|🔄|✅) \|/g);
        const sections = [];
        
        if (statusMatch) {
          for (const row of statusMatch) {
            const numMatch = row.match(/\| (\d+) \|/);
            const statusMatch = row.match(/\| (⬜|🔄|✅) \|/);
            if (numMatch && statusMatch) {
              sections.push({ num: numMatch[1], status: statusMatch[1] });
            }
          }
        }
        
        courseDirs.push({ topic, sections });
      }
    }
  }
  
  if (courseDirs.length > 0) {
    context.systemMessage += '\n\n## Active Courses\n';
    
    for (const course of courseDirs) {
      const completed = course.sections.filter(s => s.status === '✅').length;
      const total = course.sections.length;
      context.systemMessage += `- ${course.topic}: ${completed}/${total} sections complete\n`;
    }
  }
}

async function readdir(path, options) {
  const { readdirSync } = await import('fs');
  return readdirSync(path, options);
}
