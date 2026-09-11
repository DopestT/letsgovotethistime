from pathlib import Path
import xml.etree.ElementTree as ET

# Homepage navigation
p = Path('index.html')
s = p.read_text()
if 'href="/voter-guide"' not in s:
    s = s.replace('<a href="/voting-map">Voting map</a>', '<a href="/voting-map">Voting map</a>\n      <a href="/voter-guide">Voter guide</a>')
p.write_text(s)

# Voting map navigation + state action
p = Path('voting-map.html')
s = p.read_text()
if 'id="voterGuideTool"' not in s:
    s = s.replace('<nav><a href="/check-in">Check in</a>', '<nav><a href="/voter-guide">Voter guide</a><a href="/check-in">Check in</a>')
    s = s.replace('<a class="button ghost" id="statePageTool" href="/voting-map">STATE RESOURCE PAGE →</a>', '<a class="button ghost" id="statePageTool" href="/voting-map">STATE RESOURCE PAGE →</a><a class="button ghost wide" id="voterGuideTool" href="/voter-guide">VOTER GUIDE →</a>')
p.write_text(s)

# Voting map behavior: keep selected state when opening the guide
p = Path('voting-map.js')
s = p.read_text()
needle = "$('#statePageTool').href=e?`/voting-map/${e[2]}`:'/voting-map';"
if "$('#voterGuideTool').href" not in s and needle in s:
    s = s.replace(needle, needle + "$('#voterGuideTool').href=e?`/voter-guide?state=${code}`:'/voter-guide';")
p.write_text(s)

# Sitemap
p = Path('sitemap.xml')
s = p.read_text()
if 'https://letsgovotethistime.com/voter-guide' not in s:
    insert = '''  <url>\n    <loc>https://letsgovotethistime.com/voter-guide</loc>\n    <lastmod>2026-09-11</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.99</priority>\n  </url>\n'''
    pos = s.find('  <url>', s.find('</url>') + 6)
    s = s[:pos] + insert + s[pos:]
p.write_text(s)
