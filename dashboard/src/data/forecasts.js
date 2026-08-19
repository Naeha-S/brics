// BRICS-AETHER: PINN Atmospheric Forecasting Data & Corridor Bounding Polygons
export const FORECASTS = {
  tamilnadu: {
    label: 'Tamil Nadu — Chennai–Coimbatore Corridor',
    data: [68, 74, 82, 95, 118, 142, 128, 98],
    base: [62, 64, 66, 68, 70, 72, 74, 76],
    note: 'Sea-breeze 9 km/h • NE monsoon regime • PM2.5 sea-salt & urban mix',
    badge: '142 in 36h'
  },
  delhi: {
    label: 'Indo-Gangetic • Delhi–NCR Corridors',
    data: [112, 128, 142, 198, 312, 278, 210, 165],
    base: [95, 98, 102, 105, 108, 110, 112, 115],
    note: 'NW 12 km/h wind advection • Agricultural stubble plume',
    badge: '312 in 14h'
  },
  beijing: {
    label: 'Beijing–Tianjin–Hebei Basin',
    data: [140, 165, 188, 210, 245, 260, 230, 200],
    base: [110, 115, 118, 120, 122, 124, 126, 128],
    note: 'East 8 km/h • Industrial stagnation & thermal inversion',
    badge: '260 in 36h'
  },
  saopaulo: {
    label: 'São Paulo–Rio Coastal Corridor',
    data: [85, 98, 110, 135, 168, 152, 118, 96],
    base: [70, 72, 74, 76, 78, 80, 82, 84],
    note: 'S/SE 6 km/h • Biomass burning & urban emissions',
    badge: '168 in 24h'
  },
  cairo: {
    label: 'Egypt — Cairo–Alexandria Nile Delta',
    data: [92, 105, 118, 142, 178, 165, 132, 102],
    base: [78, 80, 82, 84, 86, 88, 90, 92],
    note: 'NW 11 km/h • Mineral dust + urban black carbon',
    badge: '178 in 24h'
  },
  addis: {
    label: 'Ethiopia — Addis Ababa Rift Valley',
    data: [55, 62, 71, 88, 112, 102, 84, 66],
    base: [48, 50, 52, 54, 56, 58, 60, 62],
    note: 'SW 7 km/h • Biomass domestic heating',
    badge: '112 in 24h'
  },
  tehran: {
    label: 'Iran — Tehran–Isfahan Basin',
    data: [88, 102, 118, 145, 182, 168, 132, 102],
    base: [72, 74, 76, 78, 80, 82, 84, 86],
    note: 'West 9 km/h • Topographic trapping & industrial',
    badge: '182 in 24h'
  },
  riyadh: {
    label: 'Saudi Arabia — Riyadh Plateau',
    data: [78, 92, 108, 132, 168, 155, 122, 92],
    base: [65, 67, 69, 71, 73, 75, 77, 79],
    note: 'North 10 km/h • Convective dust advection',
    badge: '168 in 24h'
  },
  dubai: {
    label: 'UAE — Dubai–Abu Dhabi Coast',
    data: [62, 71, 82, 98, 124, 112, 88, 68],
    base: [52, 54, 56, 58, 60, 62, 64, 66],
    note: 'NW 8 km/h • Marine aerosol + coarse PM',
    badge: '124 in 24h'
  },
  jakarta: {
    label: 'Indonesia — Greater Jakarta Basin',
    data: [58, 66, 75, 92, 118, 108, 84, 64],
    base: [50, 52, 54, 56, 58, 60, 62, 64],
    note: 'SE 6 km/h • Peatland combustion & vehicle fleet',
    badge: '118 in 24h'
  },
  moscow: {
    label: 'Russia — Moscow Metropolitan Area',
    data: [60, 72, 88, 105, 132, 118, 92, 75],
    base: [55, 56, 58, 60, 62, 64, 66, 68],
    note: 'NE 10 km/h • Planetary Boundary Layer 180m',
    badge: '132 in 24h'
  },
  joburg: {
    label: 'South Africa — Highveld Corridor',
    data: [70, 82, 95, 118, 145, 130, 105, 82],
    base: [60, 62, 64, 66, 68, 70, 72, 74],
    note: 'SW 14 km/h • Coal-fired generation & mine dust',
    badge: '145 in 24h'
  }
};
