const fs=require('fs');
const L=[["v0","print('a')\nprint('%.1e' % 0)\nprint('b')"],["v1","print('a')\nprint('%.1e' % 0.0)\nprint('b')"],["v2","print('a')\nprint('%.1e' % -0.0)\nprint('b')"],["v3","print('a')\nprint('%.1e' % 1e-300)\nprint('b')"],["v4","print('a')\nprint('%.1e' % 1e-320)\nprint('b')"],["v5","print('a')\nprint('%.1e' % 1e-310)\nprint('b')"]];
fs.writeFileSync('_work/v41/_p234k.json',JSON.stringify(L.map(([name,code])=>({name,code}))));
