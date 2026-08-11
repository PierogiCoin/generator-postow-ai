import { Project } from 'ts-morph';
const project = new Project({ tsConfigFilePath: './tsconfig.json' });

const sourceFiles = project.getSourceFiles('types/*.ts');

for (const sf of sourceFiles) {
    if (sf.getBaseName() === 'index.ts') continue;
    sf.fixMissingImports();
    sf.organizeImports();
}

project.saveSync();
console.log('Fixed missing imports in types/*.ts');
