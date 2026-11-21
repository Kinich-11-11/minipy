const fs=require('fs');
const L=[["w1","print('a')\nprint('%.1e' % -0.0)\nprint('b')"],["w2","print('a')\nprint('%.3e' % 5e-324)\nprint('b')"],["w3","print('a')\nprint('%.100e' % 1e-310)\nprint('b')"],["w4","print('a')\nprint('%.2e' % 1e-310)\nprint('b')"]];
fs.writeFileSync('_work/v41/_p234j.json',JSON.stringify(L.map(([name,code])=>({name,code}))));
