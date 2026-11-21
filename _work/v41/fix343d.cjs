const fs = require('fs');
let s = fs.readFileSync('_work/v41/p343.txt', 'utf8');
s = s.replace("return nameOfArg(q.inputs.OPERAND1) === '#hi' && litOf(q.inputs.OPERAND2) === '1';",
              "const a = q.inputs.NUM1 || q.inputs.OPERAND1;\n    const b2 = q.inputs.NUM2 || q.inputs.OPERAND2;\n    return nameOfArg(a) === '#hi' && litOf(b2) === '1';");
fs.writeFileSync('_work/v41/p343.txt', s);
console.log('NUM1/NUM2 handled');