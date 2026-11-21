import json, os, io
fails = json.load(open('_res209n/_new1_alias.out.json', encoding='utf8'))
allf = []
for tag in ['_new1_alias','_new2_algo','_new3_str','_new4_oop','_new5_func','_new6_edge']:
    for r in json.load(open(f'_res209n/{tag}.out.json', encoding='utf8')):
        if not r['same']: allf.append((tag, r['name'], r['code']))
for i,(tag,name,code) in enumerate(allf):
    slug = name.replace(' ','_')
    with open(f'_iso209/_i{i:02d}_{slug}.txt','w',encoding='utf8',newline='\n') as f:
        f.write('### '+name+'\n'+code+'\n')
    print(i, tag, name)
