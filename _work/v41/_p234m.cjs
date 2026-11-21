const fs=require('fs');
const L=[["p1","print(1e-320)"],["p2","print(5e-324)"],["p3","print(1e-300)"],["p4","print(2.2250738585072014e-308)"],["p5","print(1e-310)"],["zo","print('%.1e' % 0)\nprint(f'{-0.0:.1e}')\nprint('%.2e' % 0.0)"],["ze","print('%.1e' % 1e-300)\nprint('%.3e' % 5e-324)\nprint('%.2e' % 2.5e-308)"]];
fs.writeFileSync('_work/v41/_p234m.json',JSON.stringify(L.map(([name,code])=>({name,code}))));
