const fs=require('fs');
const L=[["z1","print(f'{-0.0:.1e}')"],["z2","print('%.1e' % -0.0)\nprint('after')"],["z3","print('%.3e' % 5e-324)"],["z4","print('%.2e' % 2.5e-308)"],["z5","print('%e' % 1e-7)"],["z6","print('%.100e' % 1e-310)"]];
fs.writeFileSync('_work/v41/_p234i.json',JSON.stringify(L.map(([name,code])=>({name,code}))));
