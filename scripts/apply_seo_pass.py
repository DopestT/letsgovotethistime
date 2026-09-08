from pathlib import Path
import json
import re

SITE = "https://letsgovotethistime.com"
TODAY = "2026-09-08"

PAGES = {
    "index.html": {
        "url": f"{SITE}/",
        "title": "Find Your Voting Location & Plan a Ride | 2026 Election",
        "description": "Find your official 2026 voting location, check registration resources, plan transportation to the polls, and use the live anonymous voting map.",
        "type": "WebPage",
        "crumb": "Home",
    },
    "voting-map.html": {
        "url": f"{SITE}/voting-map",
        "title": "2026 Voting Map: Live Anonymous Check-Ins & Official Info",
        "description": "Explore the live 2026 U.S. voting map, anonymous Voted/Not Yet check-ins, state and district totals, and links to official voting information.",
        "type": "CollectionPage",
        "crumb": "2026 Voting Map",
    },
    "check-in.html": {
        "url": f"{SITE}/check-in",
        "title": "Did You Vote? Anonymous 2026 Voting Check-In",
        "description": "Check in anonymously as Voted or Not Yet for the 2026 election and help light up the national map without sharing your candidate or ballot choices.",
        "type": "WebPage",
        "crumb": "Anonymous Voting Check-In",
    },
    "ride-board.html": {
        "url": f"{SITE}/ride-board",
        "title": "2026 Ride Board: Uber, Lyft, Transit & Local Voting Rides",
        "description": "Compare 2026 voter transportation resources including Uber, Lyft, public transit, paratransit, 211, and verified local ride programs.",
        "type": "CollectionPage",
        "crumb": "2026 Ride Board",
    },
    "rides-to-polls.html": {
        "url": f"{SITE}/rides-to-polls",
        "title": "Rides to the Polls 2026: Uber, Lyft, Transit & More",
        "description": "Plan transportation to the polls for Election Day 2026. Check current Uber, Lyft, transit, paratransit, taxi, walking, and driving options.",
        "type": "WebPage",
        "crumb": "Rides to the Polls 2026",
    },
    "register.html": {
        "url": f"{SITE}/register",
        "title": "Register to Vote in 2026 | Registration & Status Resources",
        "description": "Register to vote or update your voter registration for the 2026 election, then verify your official voting location and make your voting plan.",
        "type": "WebPage",
        "crumb": "Register to Vote",
    },
    "voter-help.html": {
        "url": f"{SITE}/voter-help",
        "title": "Voter Help 2026: Election Protection Hotlines & Official Resources",
        "description": "Get nonpartisan 2026 voter help, Election Protection hotline numbers, and official state and federal voting-information resources.",
        "type": "WebPage",
        "crumb": "Voter Help",
    },
    "national-voter-registration-day.html": {
        "url": f"{SITE}/national-voter-registration-day",
        "title": "National Voter Registration Day 2026 | September 15",
        "description": "National Voter Registration Day is September 15, 2026. Register or update your registration, verify where you vote, and make a transportation plan.",
        "type": "WebPage",
        "crumb": "National Voter Registration Day 2026",
    },
    "partner-kit.html": {
        "url": f"{SITE}/partner-kit",
        "title": "2026 Voter Outreach Partner Kit | Let's Go Vote This Time",
        "description": "Free nonpartisan 2026 voter outreach links and share copy for libraries, campuses, nonprofits, community groups, businesses, and local partners.",
        "type": "WebPage",
        "crumb": "2026 Partner Kit",
    },
}


def set_meta(html: str, name: str, content: str) -> str:
    pattern = re.compile(rf'<meta\s+name="{re.escape(name)}"[^>]*>', re.I)
    html = pattern.sub('', html)
    tag = f'  <meta name="{name}" content="{content}" />\n'
    return html.replace('</head>', tag + '</head>', 1)


def set_property(html: str, prop: str, content: str) -> str:
    pattern = re.compile(rf'<meta\s+property="{re.escape(prop)}"[^>]*>', re.I)
    html = pattern.sub('', html)
    tag = f'  <meta property="{prop}" content="{content}" />\n'
    return html.replace('</head>', tag + '</head>', 1)


def set_title(html: str, title: str) -> str:
    return re.sub(r'<title>.*?</title>', f'<title>{title}</title>', html, count=1, flags=re.I | re.S)


def ensure_alternate(html: str, url: str) -> str:
    html = re.sub(r'\s*<link\s+rel="alternate"\s+hreflang="(?:en-US|x-default)"[^>]*>', '', html, flags=re.I)
    canonical = re.compile(r'(<link\s+rel="canonical"\s+href="[^"]+"\s*/?>)', re.I)
    addition = f'\n  <link rel="alternate" hreflang="en-US" href="{url}" />\n  <link rel="alternate" hreflang="x-default" href="{url}" />'
    return canonical.sub(r'\1' + addition, html, count=1)


def schema_for(info):
    page = {
        "@type": info["type"],
        "@id": info["url"] + "#webpage",
        "url": info["url"],
        "name": info["title"],
        "description": info["description"],
        "inLanguage": "en-US",
        "dateModified": TODAY,
        "isPartOf": {
            "@type": "WebSite",
            "@id": SITE + "/#website",
            "url": SITE + "/",
            "name": "Let's Go Vote This Time",
        },
    }
    graph = [page]
    if info["url"] != SITE + "/":
        graph.append({
            "@type": "BreadcrumbList",
            "@id": info["url"] + "#breadcrumb",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Let's Go Vote This Time", "item": SITE + "/"},
                {"@type": "ListItem", "position": 2, "name": info["crumb"], "item": info["url"]},
            ],
        })
    return {"@context": "https://schema.org", "@graph": graph}


def set_schema(html: str, info) -> str:
    html = re.sub(r'\s*<script\s+type="application/ld\+json"\s+id="seo-page-schema">.*?</script>', '', html, flags=re.I | re.S)
    payload = json.dumps(schema_for(info), ensure_ascii=False, separators=(",", ":"))
    script = f'  <script type="application/ld+json" id="seo-page-schema">{payload}</script>\n'
    return html.replace('</head>', script + '</head>', 1)


def set_special_schema(filename: str, html: str) -> str:
    html = re.sub(r'\s*<script\s+type="application/ld\+json"\s+id="seo-dataset-schema">.*?</script>', '', html, flags=re.I | re.S)
    html = re.sub(r'\s*<script\s+type="application/ld\+json"\s+id="seo-ride-list-schema">.*?</script>', '', html, flags=re.I | re.S)
    if filename == "voting-map.html":
        payload = {
            "@context": "https://schema.org",
            "@type": "Dataset",
            "name": "2026 Anonymous Voting Check-In Map",
            "description": "Privacy-thresholded aggregate counts of voluntary anonymous 2026 Voted and Not Yet check-ins by U.S. state and congressional district. These self-reports are not official turnout statistics.",
            "url": f"{SITE}/voting-map",
            "creator": {"@type": "Organization", "name": "Let's Go Vote This Time", "url": SITE + "/"},
            "spatialCoverage": {"@type": "Country", "name": "United States"},
            "temporalCoverage": "2026-09-08/2026-11-03",
            "measurementTechnique": "Voluntary anonymous self-report with privacy-thresholded public aggregation",
            "isAccessibleForFree": True,
            "distribution": {
                "@type": "DataDownload",
                "encodingFormat": "application/json",
                "contentUrl": "https://zxmdfmiueapjhktqchts.supabase.co/functions/v1/lgvtt-map-public",
            },
        }
        script = '  <script type="application/ld+json" id="seo-dataset-schema">' + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + '</script>\n'
        html = html.replace('</head>', script + '</head>', 1)
    if filename == "ride-board.html":
        names = ["Uber", "Lyft", "Public Transit", "Paratransit and Accessible Rides", "211", "Local Nonprofit and Community Rides"]
        payload = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "2026 Voter Transportation Resources",
            "url": f"{SITE}/ride-board",
            "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "name": name}
                for i, name in enumerate(names)
            ],
        }
        script = '  <script type="application/ld+json" id="seo-ride-list-schema">' + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + '</script>\n'
        html = html.replace('</head>', script + '</head>', 1)
    return html


def optimize_page(filename: str, info):
    path = Path(filename)
    html = path.read_text(encoding="utf-8")
    html = set_title(html, info["title"])
    html = set_meta(html, "description", info["description"])
    html = set_meta(html, "robots", "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1")
    html = set_property(html, "og:title", info["title"])
    html = set_property(html, "og:description", info["description"])
    html = set_property(html, "og:url", info["url"])
    html = set_property(html, "og:locale", "en_US")
    html = set_meta(html, "twitter:card", "summary")
    html = set_meta(html, "twitter:title", info["title"])
    html = set_meta(html, "twitter:description", info["description"])
    html = ensure_alternate(html, info["url"])
    html = set_schema(html, info)
    html = set_special_schema(filename, html)
    path.write_text(html, encoding="utf-8")


for filename, info in PAGES.items():
    if Path(filename).exists():
        optimize_page(filename, info)

sitemap = Path("sitemap.xml")
if sitemap.exists():
    text = sitemap.read_text(encoding="utf-8")
    text = re.sub(r'<lastmod>[^<]+</lastmod>', f'<lastmod>{TODAY}</lastmod>', text)
    sitemap.write_text(text, encoding="utf-8")

llms = """# Let's Go Vote This Time\n\n> Nonpartisan 2026 voter-access utility for official voting information, voter registration resources, self-service transportation planning, voter-help resources, and an anonymous self-reported voting check-in map.\n\n## Core resources\n- Home / voting plan: https://letsgovotethistime.com/\n- 2026 interactive voting map: https://letsgovotethistime.com/voting-map\n- Anonymous Voted / Not Yet check-in: https://letsgovotethistime.com/check-in\n- Register to vote: https://letsgovotethistime.com/register\n- Rides to the polls 2026: https://letsgovotethistime.com/rides-to-polls\n- 2026 Ride Board: https://letsgovotethistime.com/ride-board\n- Voter help / Election Protection resources: https://letsgovotethistime.com/voter-help\n- National Voter Registration Day 2026: https://letsgovotethistime.com/national-voter-registration-day\n- Partner kit: https://letsgovotethistime.com/partner-kit\n\n## Important data boundaries\n- Official election information is linked from official election authorities and is kept separate from anonymous check-ins.\n- Voting check-ins are voluntary self-reports, not official turnout statistics or proof that a ballot was cast.\n- The site does not ask how a person voted, which candidate they support, or their party affiliation.\n- The site does not book, dispatch, pay for, reimburse, or guarantee transportation. Voters make their own arrangements directly with providers.\n\n## Canonical domain\nhttps://letsgovotethistime.com/\n"""
Path("llms.txt").write_text(llms, encoding="utf-8")

print("SEO pass applied to", len(PAGES), "core pages")
