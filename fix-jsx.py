import re, sys, os

def fix_file(path):
    content = open(path).read()
    fixed = re.sub(
        r'\n([ \t]+)\n([ \t]+)(href=|key=|onClick=|target=)',
        lambda m: '\n' + m.group(1) + '<a\n' + m.group(2) + m.group(3),
        content
    )
    if fixed != content:
        open(path, 'w').write(fixed)
        print(f'FIXED: {path}')
    else:
        print(f'OK: {path}')

if len(sys.argv) > 1:
    fix_file(sys.argv[1])
else:
    for root, dirs, files in os.walk('/Users/mac/suiwill/app'):
        for f in files:
            if f.endswith('.tsx'):
                fix_file(os.path.join(root, f))
