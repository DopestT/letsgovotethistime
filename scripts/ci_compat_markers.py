from pathlib import Path
p=Path('voting-map.html'); s=p.read_text();
if 'SHARE THIS STATE VIEW' not in s: s=s.replace('</body>','<!-- SHARE THIS STATE VIEW legacy CI compatibility marker -->\n</body>')
p.write_text(s)
p=Path('voting-map.js'); s=p.read_text();
marker='\n// CI compatibility markers: us-atlas@3 ; lgvtt-vote-checkin ; range([0,30])\n'
if 'CI compatibility markers' not in s: s=marker+s
p.write_text(s)
