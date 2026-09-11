from pathlib import Path
p=Path('sitemap.xml')
s=p.read_text()
url='https://letsgovotethistime.com/report-election-problem'
if url not in s:
    block='''  <url>\n    <loc>https://letsgovotethistime.com/report-election-problem</loc>\n    <lastmod>2026-09-11</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.90</priority>\n  </url>\n'''
    marker='  <url>\n    <loc>https://letsgovotethistime.com/check-in</loc>'
    s=s.replace(marker,block+marker,1)
p.write_text(s)
