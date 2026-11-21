const fs=require('fs');
const base="class N:\n    def __init__(self, v, nx=None):\n        self.v = v\n        self.nx = nx\nl = [N(1)]\nd = {'k': N(0, N(0, N(0)))}\n";
const L=[["s1",base+"d['k'].nx.nx.v = 5\nprint(d['k'].nx.nx.v)"],["s2",base+"l[0].v = 7\nprint(l[0].v)"],["s3",base+"l[0].v += 2\nprint(l[0].v)"],["s4",base+"d['k'].nx.nx.v += 3\nprint(d['k'].nx.nx.v)"]];
fs.writeFileSync('_work/v41/_p234o.json',JSON.stringify(L.map(([name,code])=>({name,code}))));
