const HOME_CHECKIN_ENDPOINT = 'https://zxmdfmiueapjhktqchts.supabase.co/functions/v1/lgvtt-vote-checkin';
const HOME_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

function homeFmt(value){ return Number(value || 0).toLocaleString(); }

async function loadHomeMap(){
  const svgNode = document.querySelector('#heroMap');
  if(!svgNode || typeof d3 === 'undefined' || typeof topojson === 'undefined') return;

  try{
    const [atlas, response] = await Promise.all([
      d3.json(HOME_ATLAS_URL),
      fetch(HOME_CHECKIN_ENDPOINT, { credentials:'omit' })
    ]);
    const data = await response.json();
    if(!response.ok || !data.ok) throw new Error('home_map_failed');

    document.querySelector('#heroMapTotal').textContent = homeFmt(data.national?.checkins);
    document.querySelector('#heroMapVoted').textContent = homeFmt(data.national?.voted);
    document.querySelector('#heroMapNotYet').textContent = homeFmt(data.national?.not_yet);

    const byCode = new Map((data.states || []).map(row => [row.state_code, row]));
    const fipsToCode = {
      '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY'
    };

    const features = topojson.feature(atlas, atlas.objects.states).features;
    const svg = d3.select(svgNode);
    const path = d3.geoPath();
    const max = d3.max(data.states || [], d => Number(d.checkins)) || 1;
    const opacity = d3.scaleSqrt().domain([0,max]).range([0.22,0.92]);
    const radius = d3.scaleSqrt().domain([0,max]).range([0,11]);

    svg.selectAll('*').remove();
    svg.append('g').selectAll('path')
      .data(features)
      .join('path')
      .attr('d', path)
      .attr('class','hero-state')
      .attr('fill-opacity', d => {
        const code = fipsToCode[String(d.id).padStart(2,'0')];
        return opacity(Number(byCode.get(code)?.checkins || 0));
      });

    const bubbles = svg.append('g');
    for(const feature of features){
      const code = fipsToCode[String(feature.id).padStart(2,'0')];
      const row = byCode.get(code);
      if(!row) continue;
      const [x,y] = path.centroid(feature);
      const voted = radius(Number(row.voted || 0));
      const notYet = radius(Number(row.not_yet || 0));
      if(voted > 0) bubbles.append('circle').attr('class','hero-dot').attr('cx',x-voted*.28).attr('cy',y).attr('r',Math.max(2.5,voted));
      if(notYet > 0) bubbles.append('circle').attr('class','hero-dot notyet').attr('cx',x+notYet*.28).attr('cy',y).attr('r',Math.max(2.5,notYet));
    }
  }catch(error){
    document.querySelector('#heroMapStatus').textContent = 'Live map totals will appear when the data layer is available.';
  }
}

loadHomeMap();
