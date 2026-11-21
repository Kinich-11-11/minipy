// fix P130: IF() takes two arguments (the else branch was silently dropped), and a function value
// holds the FnName *index* -- calluser wants the name
const fs = require('fs');
const f = '_work/v41/p130.txt';
let t = fs.readFileSync(f, 'utf8');
const rep = (a, b, tag) => {
  if (!t.includes(a)) throw new Error('anchor missing: ' + tag);
  t = t.split(a).join(b);
  console.log('ok ' + tag);
};
rep("  const tokAt = (i) => item('Tok', i);\n  B.addList(IT, 'DbgL', []);", "  const tokAt = (i) => item('Tok', i);", 'drop dbgl');
rep("          setV('p4list', VAR('ev')),\n          addTo('DbgL', JOIN(txt('L='), VAR('p4list'))),",
  "          setV('p4list', VAR('ev')),", 'drop L log');
rep("          // sort (by key when given)\n          addTo('DbgL', JOIN(txt('kw k='), JOIN(VAR('p4klo'), JOIN(txt(' r='), VAR('p4rlo'))))),\n          IF(GT(VAR('p4klo'), num(0)), [",
  "          // sort (by key when given)\n          IFELSE(GT(VAR('p4klo'), num(0)), [", 'IF->IFELSE');
rep(`          IF(EQ(VAR('error'), txt('')), [
            addTo('DbgL', JOIN(txt('out='), VAR('p4out'))),
            // reverse=...`,
  `          IF(EQ(VAR('error'), txt('')), [
            // reverse=...`, 'drop out log');
rep(`              setV('p4fn', VAR('ev')),`,
  `              // a function value is the index into FnName (p85.txt); calluser wants the name
              setV('p4fn', item('FnName', VAR('ev'))),`, 'fn name');
fs.writeFileSync(f, t);
console.log('written ' + t.length);
