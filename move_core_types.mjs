import { Project } from 'ts-morph';
import fs from 'fs';

const project = new Project({ tsConfigFilePath: './tsconfig.json' });
const indexFile = project.getSourceFile('types/index.ts');
const coreFile = project.createSourceFile('types/core.ts', '', { overwrite: true });

// Move all type aliases, interfaces, and enums from index.ts to core.ts
for (const typeAlias of indexFile.getTypeAliases()) {
    coreFile.addTypeAlias(typeAlias.getStructure());
    typeAlias.remove();
}

for (const interfaceDecl of indexFile.getInterfaces()) {
    coreFile.addInterface(interfaceDecl.getStructure());
    interfaceDecl.remove();
}

for (const enumDecl of indexFile.getEnums()) {
    coreFile.addEnum(enumDecl.getStructure());
    enumDecl.remove();
}

// Add re-export for core.ts in index.ts
indexFile.addExportDeclaration({ moduleSpecifier: './core' });

// Fix imports in core.ts
coreFile.fixMissingImports();
coreFile.organizeImports();

project.saveSync();
console.log('Moved remaining types to core.ts');
