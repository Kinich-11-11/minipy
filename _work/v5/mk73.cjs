
const fs=require('fs');
const cases=[...JSON.parse(fs.readFileSync('_work/analyze_sb3/cases.json','utf8')).map(c=>({...c,suite:'b1'})),
             ...JSON.parse(fs.readFileSync('_work/analyze_sb3/cases2.json','utf8')).map(c=>({...c,suite:'b2'}))];
fs.writeFileSync('_work/v5/cases73.json', JSON.stringify(cases,null,1));
console.log('cases', cases.length);
