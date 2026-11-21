// syntax-check a part file on its own (stubs for the builder helpers)
const fs = require('fs');
const stub = `
const patch = () => {}, J = () => {}, joinAll = () => {}, failMsg = () => {}, tokAt = () => {}, kindAt = () => {};
const STOPTHIS = () => {}, lit = '', taken = new Set(), T = () => ({}), newVar = () => {}, B = { addList: () => {}, LISTF: () => {}, REP: () => {}, VARF: () => {} };
const I = () => {}, item = () => {}, JOIN = () => {}, IF = () => {}, IFELSE = () => {}, REPEATU = () => {}, REPEAT = () => {};
const clearL = () => {}, addTo = () => {}, callProc = () => {}, setV = () => {}, chgV = () => {}, VAR = () => {}, num = () => {}, txt = () => {};
const inDef = () => {}, find = () => {}, reach = () => {}, attachBody = () => {}, newProc = () => ({ defId: 0 }), defIdOf = () => 0;
const BL = () => ({}), insertBeforeStmt = () => {}, allIds = () => [], addList = () => {}, IT = 'Interpreter', llen = () => {}, item2 = () => {};
const FLOOR = () => {}, DIV = () => {}, MUL = () => {}, ADD = () => {}, SUB = () => {}, MOD = () => {}, OR = () => {}, AND = () => {}, NOT = () => {};
const EQ = () => {}, LT = () => {}, GT = () => {}, argOf = () => {}, lenOf = () => {}, letterOf = () => {}, listHasl = () => {}, FAIL = () => {}, spliceAfter = () => {}, chain = () => {};
`;
const src = fs.readFileSync(process.argv[2], 'utf8');
fs.writeFileSync(process.argv[2] + '.chk.js', stub + src);
console.log('wrote ' + process.argv[2] + '.chk.js');
