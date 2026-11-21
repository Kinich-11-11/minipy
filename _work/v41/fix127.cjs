// one-shot rewrite of p127.txt: pass helper inputs through globals instead of procedure arguments
const fs = require('fs');
const f = '_work/v41/p127.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};

// 1. variables
rep("const VARS = ['cmet', 'cps', 'csi', 'cai', 'cch', 'cpiece', 'cup', 'ctmp', 'cpv'];",
  "const VARS = ['cmet', 'cps', 'csi', 'cai', 'cch', 'cpiece', 'cup', 'ctmp', 'cpv',\n    'cspec', 'cpar2', 'cname'];", 'vars');
rep("  B.addList(IT, 'DbgL', []);\n", "", 'drop DbgL');

// 2. splitInto: clean, no logging
const oldSplit = t.slice(t.indexOf("  const splitInto = (list, sExpr, pieceVar) => ["), t.indexOf("  // ---------- (a) clscopy"));
const newSplit = `  const splitInto = (list, sExpr, pieceVar) => [
    clearL(list), setV(pieceVar, txt('')), setV('csi', num(1)),
    REPEATU(GT(VAR('csi'), ADD(lenOf(sExpr), num(1))), [
      setV('cch', letterOf(VAR('csi'), sExpr)),
      IFELSE(OR(EQ(VAR('csi'), ADD(lenOf(sExpr), num(1))), EQ(VAR('cch'), txt(','))), [
        IF(NOT(EQ(VAR(pieceVar), txt(''))), [addTo(list, VAR(pieceVar))]),
        setV(pieceVar, txt(''))
      ], [
        setV(pieceVar, JOIN(VAR(pieceVar), VAR('cch')))
      ]),
      chgV('csi', num(1))
    ])
  ];

`;
if (!oldSplit.startsWith("  const splitInto")) throw new Error('splitInto slice');
t = t.replace(oldSplit, newSplit);
console.log('ok splitInto');

// 3. clscopy
rep("  const cp = newProc('clscopy %s', ['par']);", "  const cp = newProc('clscopy', []);", 'clscopy def');
rep("      addTo('DbgL', JOIN(txt('see '), JOIN(argOf('par'), JOIN(txt('/'), VAR('cpn'))))),\n", "", 'clscopy log');
t = t.split("argOf('par')").join("VAR('cpar2')");
console.log('ok clscopy arg');
// 4. clscopyattr
rep("  const ca = newProc('clscopyattr %s', ['par']);", "  const ca = newProc('clscopyattr', []);", 'clscopyattr def');
// 5. clssplit / clspar / iscls
rep("  const sp = newProc('clssplit %s', ['spec']);\n  attachBody(sp.defId, splitInto('CQ2', argOf('spec'), 'cpv'));",
  "  const sp = newProc('clssplit', []);\n  attachBody(sp.defId, splitInto('CQ2', VAR('cspec'), 'cpv'));", 'clssplit def');
rep("  const cpar = newProc('clspar %s', ['cls']);", "  const cpar = newProc('clspar', []);", 'clspar def');
rep("argOf('cls')", "VAR('cname')", 'clspar arg');
rep("  const ic = newProc('iscls %s', ['nm']);", "  const ic = newProc('iscls', []);", 'iscls def');
rep("argOf('nm')", "VAR('cname')", 'iscls arg');

// 6. call sites
rep("    callProc('clssplit %s', [VAR('ctmp')]),", "    setV('cspec', VAR('ctmp')), callProc('clssplit', []),", 'call clssplit');
rep("        callProc('clscopy %s', [item('CQ2', VAR('csi'))]),", "        setV('cpar2', item('CQ2', VAR('csi'))), callProc('clscopy', []),", 'call clscopy');
rep("        callProc('clscopyattr %s', [item('CQ2', VAR('csi'))]),", "        setV('cpar2', item('CQ2', VAR('csi'))), callProc('clscopyattr', []),", 'call clscopyattr');
rep("    callProc('clspar %s', [VAR('cmet')]),", "    setV('cname', VAR('cmet')), callProc('clspar', []),", 'call clspar');
rep("      callProc('iscls %s', [tokAt(argOf('lo'))]),", "      setV('cname', tokAt(argOf('lo'))), callProc('iscls', []),", 'call iscls');

// 7. note in the header
rep("// `ClsPar` (parallel to ClsName)",
  "// NB: the helpers below take their input through globals (`cspec`, `cpar2`, `cname`) rather\n// than through procedure arguments.  A Scratch custom block's arguments live on the stack\n// frame of the calling block, and scratch-vm recycles frames (and keeps their `executed`\n// flag), so a second call of the same custom block could still read the first call's\n// argument.  Globals are read fresh on every use.\n//\n// `ClsPar` (parallel to ClsName)", 'header note');

fs.writeFileSync(f, t);
console.log('written ' + t.length + ' bytes');
