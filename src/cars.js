/* =========================================================
   养车有谱 · 车模渲染
   侧面视角的 SVG 汽车：可切换车型与车漆，车轮持续旋转。
   坐标基准 320×137，地面 y=133，车身底裙 y=116。
   视口底边即地面，车轮底部贴住底边，便于容器精确定位。
   依赖：无。挂载到 window.YCCar。
   ========================================================= */
(function (global) {
  "use strict";

  /* 车漆：base 车身主色，top 高光，shade 暗部，deep 裙边与缝隙 */
  const PAINTS = {
    pearl: {
      label: "珍珠白", dot: "#f3f8fb",
      base: "#ffffff", top: "#fdfeff", shade: "#dce9f1", deep: "#9db6c6",
      rim: "#cfdde7", glass: "#2b4a5c", glass2: "#71a8c6",
    },
    night: {
      label: "曜石黑", dot: "#39424e",
      base: "#4d5765", top: "#7d8794", shade: "#2f3742", deep: "#151b23",
      rim: "#9aa7b5", glass: "#0e1923", glass2: "#41637a",
    },
    ocean: {
      label: "星际蓝", dot: "#4a97dd",
      base: "#5cb0f0", top: "#a5d9ff", shade: "#3679bd", deep: "#1b588f",
      rim: "#e2f2ff", glass: "#123049", glass2: "#59a0cc",
    },
    chili: {
      label: "赤焰红", dot: "#e2555f",
      base: "#f46a6d", top: "#ffa4a5", shade: "#cb3a47", deep: "#8f202c",
      rim: "#ffe2e2", glass: "#371318", glass2: "#9c5560",
    },
    forest: {
      label: "松石绿", dot: "#2fae86",
      base: "#4ecaa3", top: "#8eebcb", shade: "#1d9a76", deep: "#0a6649",
      rim: "#dcfbf0", glass: "#0e352d", glass2: "#4f9b86",
    },
    sand: {
      label: "暖沙金", dot: "#dfb468",
      base: "#f3d59f", top: "#fff1d4", shade: "#d3a65c", deep: "#a07733",
      rim: "#fff8e8", glass: "#3a2f1c", glass2: "#a58f61",
    },
  };

  /* 车型：wheels 为 [轮心x, 轮心y, 轮胎半径] */
  const MODELS = {
    sedan: {
      label: "轿车",
      note: "低趴三厢",
      wheels: [[86, 111, 21], [240, 111, 21]],
      body: "M36 116 L30 108 L31 92 C31 89 33 88 37 88 L72 86 C80 85 85 82 89 76 L112 51 C118 44 127 40 139 40 L186 40 C198 40 207 44 213 51 L237 76 C241 82 247 85 255 86 L286 88 C296 89 300 94 300 102 L300 112 C300 115 297 116 292 116 Z",
      roof: "M114 49 C120 43 128 40 138 40 L186 40 C196 40 204 43 210 49",
      glass: [
        "M97 78 L119 52 C122 47 127 44 133 44 L148 44 L148 78 Z",
        "M154 44 L185 44 C192 44 197 47 201 51 L220 78 L154 78 Z",
      ],
      glints: ["M121 54 L135 45 L141 45 L125 59 Z", "M160 48 L174 46 L176 51 L162 53 Z"],
      art: `<path d="M134 81 L134 110" stroke="{deep}" stroke-width="1.7" stroke-linecap="round" opacity=".42"/>
        <path d="M178 81 L178 111" stroke="{deep}" stroke-width="1.7" stroke-linecap="round" opacity=".42"/>
        <rect x="140" y="90" width="14" height="4" rx="2" fill="{deep}" opacity=".5"/>
        <rect x="184" y="90" width="13" height="4" rx="2" fill="{deep}" opacity=".5"/>
        <path d="M199 54 q9 -2 10 6 q-8 2 -10 -1 z" fill="{shade}"/>
        <ellipse cx="291" cy="96" rx="9.5" ry="5" fill="#fff4c9"/>
        <ellipse cx="289" cy="95" rx="4" ry="2" fill="#fffdf0"/>
        <rect x="30" y="94" width="6" height="11" rx="3" fill="#ff6b78"/>
        <path d="M47 111 L288 111" stroke="{deep}" stroke-width="2" opacity=".22"/>`,
    },
    suv: {
      label: "SUV",
      note: "高底盘大空间",
      wheels: [[94, 110, 23], [230, 110, 23]],
      body: "M30 116 L27 92 C26 76 31 66 45 64 L74 60 L94 35 C99 28 107 25 118 25 L206 25 C220 25 230 30 236 40 L254 70 C258 77 264 80 274 81 L288 82 C297 83 301 88 301 97 L301 111 C301 115 298 116 293 116 Z",
      roof: "M98 40 C102 31 108 25 118 25 L204 25 C214 25 222 30 228 38",
      glass: [
        "M100 62 L116 37 C119 32 124 30 130 30 L146 30 L146 62 Z",
        "M152 30 L204 30 C213 30 220 34 224 40 L240 62 L152 62 Z",
      ],
      glints: ["M119 39 L133 32 L139 32 L123 44 Z", "M159 35 L173 33 L175 38 L161 40 Z"],
      art: `<path d="M110 19 L200 19" stroke="{deep}" stroke-width="4" stroke-linecap="round" opacity=".85"/>
        <path d="M126 22 L126 26" stroke="{deep}" stroke-width="3" stroke-linecap="round" opacity=".85"/>
        <path d="M184 22 L184 26" stroke="{deep}" stroke-width="3" stroke-linecap="round" opacity=".85"/>
        <path d="M140 64 L140 110" stroke="{deep}" stroke-width="1.7" stroke-linecap="round" opacity=".4"/>
        <path d="M182 64 L182 112" stroke="{deep}" stroke-width="1.7" stroke-linecap="round" opacity=".4"/>
        <rect x="146" y="73" width="15" height="4" rx="2" fill="{deep}" opacity=".45"/>
        <rect x="188" y="73" width="14" height="4" rx="2" fill="{deep}" opacity=".45"/>
        <path d="M222 42 q10 -2 11 7 q-9 2 -12 -2 z" fill="{shade}"/>
        <rect x="289" y="89" width="12" height="9" rx="4" fill="#fff4c9"/>
        <rect x="29" y="90" width="7" height="13" rx="3.5" fill="#ff6b78"/>
        <rect x="26" y="108" width="44" height="7" rx="3.5" fill="{deep}" opacity=".5"/>
        <path d="M44 111 L288 111" stroke="{deep}" stroke-width="2" opacity=".2"/>`,
    },
    sports: {
      label: "跑车",
      note: "低矮流线",
      wheels: [[90, 110, 23], [236, 110, 23]],
      body: "M24 116 L22 109 L23 101 C23 97 26 95 33 93 L74 88 C82 86 86 82 90 74 L114 57 C122 50 134 47 150 48 L188 51 C200 52 209 56 215 62 L237 81 C241 86 247 88 255 89 L285 91 C295 92 299 96 299 103 L299 111 C299 115 296 116 291 116 Z",
      roof: "M116 55 C124 48 136 47 150 48 L188 51 C197 52 204 55 210 60",
      glass: [
        "M96 78 L118 59 C122 54 128 52 134 52 L148 53 L148 78 Z",
        "M154 53 L186 56 C192 57 197 60 200 64 L213 78 L154 78 Z",
      ],
      glints: ["M119 57 L132 53 L138 53 L123 62 Z", "M160 57 L173 58 L175 63 L162 62 Z"],
      art: `<path d="M23 100 L47 94 L48 99 L24 105 Z" fill="{deep}" opacity=".9"/>
        <path d="M176 80 L176 110" stroke="{deep}" stroke-width="1.7" stroke-linecap="round" opacity=".45"/>
        <rect x="186" y="86" width="14" height="4" rx="2" fill="{deep}" opacity=".45"/>
        <path d="M206 60 q10 -1 10 6 q-8 2 -10 -2 z" fill="{shade}"/>
        <path d="M288 96 q11 2 11 8 q-7 1 -11 -2 z" fill="#fff4c9"/>
        <path d="M242 95 q12 3 20 1" stroke="{deep}" stroke-width="2" fill="none" opacity=".35"/>
        <rect x="25" y="96" width="7" height="9" rx="3.5" fill="#ff6b78"/>
        <path d="M40 111 L286 111" stroke="{deep}" stroke-width="2" opacity=".22"/>`,
    },
    pickup: {
      label: "皮卡",
      note: "带后斗能装",
      wheels: [[92, 110, 23], [234, 110, 23]],
      body: "M28 116 L26 92 C25 87 29 84 37 84 L118 84 L118 44 C118 38 122 34 130 34 L196 34 C208 34 216 39 222 48 L240 76 C244 81 250 84 258 85 L288 86 C297 87 301 92 301 100 L301 111 C301 115 298 116 293 116 Z",
      roof: "M126 44 C126 38 130 34 136 34 L196 34 C204 34 211 37 216 43",
      glass: [
        "M126 71 L126 44 C126 40 129 38 133 38 L150 38 L150 71 Z",
        "M156 38 L192 38 C200 38 206 42 210 48 L224 71 L156 71 Z",
      ],
      glints: ["M130 46 L144 40 L148 40 L134 52 Z", "M163 43 L176 41 L178 46 L165 48 Z"],
      art: `<path d="M33 88 L113 88 L113 100 L33 100 Z" fill="{deep}" opacity=".4"/>
        <path d="M33 87 L113 87" stroke="{deep}" stroke-width="2.6" stroke-linecap="round" opacity=".75"/>
        <path d="M120 78 L120 111" stroke="{deep}" stroke-width="2" stroke-linecap="round" opacity=".5"/>
        <path d="M166 73 L166 110" stroke="{deep}" stroke-width="1.7" stroke-linecap="round" opacity=".4"/>
        <rect x="176" y="80" width="14" height="4" rx="2" fill="{deep}" opacity=".45"/>
        <path d="M212 50 q10 -1 11 6 q-9 2 -12 -2 z" fill="{shade}"/>
        <rect x="289" y="92" width="11" height="8" rx="4" fill="#fff4c9"/>
        <rect x="27" y="94" width="7" height="12" rx="3.5" fill="#ff6b78"/>
        <path d="M44 111 L286 111" stroke="{deep}" stroke-width="2" opacity=".2"/>`,
    },
    hatch: {
      label: "两厢",
      note: "小巧好停",
      wheels: [[98, 112, 20], [232, 112, 20]],
      body: "M54 116 L47 110 L49 84 C50 78 52 72 56 66 L74 48 C80 42 88 39 98 38 L186 38 C199 38 208 43 214 52 L236 82 C240 87 246 89 254 90 L284 92 C294 93 298 97 298 105 L298 112 C298 115 295 116 290 116 Z",
      roof: "M66 55 C72 45 82 39 96 38 L186 38 C195 38 203 42 209 49",
      glass: [
        "M70 80 L82 60 C86 54 91 52 96 52 L118 52 L118 80 Z",
        "M124 52 L186 50 C193 50 198 53 202 58 L218 82 L124 82 Z",
      ],
      glints: ["M85 61 L96 55 L101 55 L89 66 Z", "M131 57 L143 56 L145 61 L133 62 Z"],
      art: `<path d="M140 84 L140 110" stroke="{deep}" stroke-width="1.7" stroke-linecap="round" opacity=".4"/>
        <path d="M182 84 L182 111" stroke="{deep}" stroke-width="1.7" stroke-linecap="round" opacity=".4"/>
        <rect x="146" y="92" width="15" height="4" rx="2" fill="{deep}" opacity=".45"/>
        <rect x="188" y="92" width="13" height="4" rx="2" fill="{deep}" opacity=".45"/>
        <path d="M199 53 q9 -2 10 6 q-8 2 -11 -1 z" fill="{shade}"/>
        <ellipse cx="289" cy="99" rx="9" ry="4.6" fill="#fff4c9"/>
        <rect x="48" y="94" width="6" height="12" rx="3" fill="#ff6b78"/>
        <path d="M56 111 L284 111" stroke="{deep}" stroke-width="2" opacity=".22"/>`,
    },
  };

  const ORDER = ["sedan", "suv", "sports", "pickup", "hatch"];
  let seq = 0;

  function tint(str, p) {
    return String(str).replace(/\{(top|base|shade|deep|rim|glass|glass2)\}/g, (_, k) => p[k] || "#000");
  }

  function wheel(cx, cy, r, p, uid, still) {
    const rimR = Math.round(r * 0.58 * 10) / 10;
    const spokes = [0, 72, 144, 216, 288].map((a) =>
      `<rect x="-1.9" y="${-(rimR - 1.6).toFixed(1)}" width="3.8" height="${(rimR - 3.6).toFixed(1)}" rx="1.9" fill="#f2f9fd" transform="rotate(${a})"/>`
    ).join("");
    return `<g class="wheel" transform="translate(${cx} ${cy})">
      <circle r="${r}" fill="#19262f"/>
      <circle r="${(r - 2.2).toFixed(1)}" fill="#2b3d49"/>
      <circle r="${(r - 5.6).toFixed(1)}" fill="none" stroke="#0f1b23" stroke-width="1" opacity=".5"/>
      <g class="wheel__hub">${still ? "" : `<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1.75s" repeatCount="indefinite"/>`}
        <circle r="${rimR}" fill="url(#${uid}-rim)"/>
        <circle r="${rimR}" fill="none" stroke="#7f95a5" stroke-width=".9" opacity=".6"/>
        ${spokes}
        <rect x="-2.3" y="${-(rimR - 1.2).toFixed(1)}" width="4.6" height="${(rimR - 3.2).toFixed(1)}" rx="2.3" fill="#16b273"/>
        <circle r="${(r * 0.18).toFixed(1)}" fill="#16323f"/>
        <circle r="${(r * 0.075).toFixed(1)}" fill="#83e6c4"/>
      </g>
      <circle r="${r}" fill="none" stroke="#101c25" stroke-width="2" opacity=".45"/>
      <path d="M ${(-r * 0.44).toFixed(1)} ${(r - 0.5).toFixed(1)} H ${(r * 0.44).toFixed(1)}" stroke="#16262f" stroke-width="${(r * 0.125).toFixed(1)}" stroke-linecap="round"/>
    </g>`;
  }

  /* style: { body, paint }；opts: { still, motion, shadow, pad } */
  function carSvg(style, opts) {
    opts = opts || {};
    const s = style || {};
    const m = MODELS[s.body] || MODELS.suv;
    const p = PAINTS[s.paint] || PAINTS.pearl;
    const uid = "yc" + (++seq);
    const still = !!opts.still;
    const motion = !still && opts.motion !== false;
    const pad = opts.pad === false ? 0 : 30;
    const floor = 117;
    /* 地面线：轮胎底部正好落在这里，视口底边与之只差 3 个单位的阴影余量 */
    const GROUND = 133;
    const VIEW_H = GROUND + 3;

    const arches = m.wheels.map(([cx, , r]) => {
      const ar = r + 10;
      return `<path d="M ${cx - ar} ${floor} A ${ar} ${ar} 0 0 1 ${cx + ar} ${floor} Z" fill="${p.deep}" opacity=".8"/>
        <path d="M ${cx - ar} ${floor} A ${ar} ${ar} 0 0 1 ${cx + ar} ${floor} Z" fill="#0e2029" opacity=".22"/>
        <path d="M ${cx - ar} ${floor} A ${ar} ${ar} 0 0 1 ${cx + ar} ${floor}" fill="none" stroke="#0e2029" stroke-width="1.4" opacity=".3"/>`;
    }).join("");

    const wheels = m.wheels.map(([cx, cy, r]) => wheel(cx, cy, r, p, uid, still)).join("");
    /* 轮胎与地面的压痕：紧贴轮底的一道暗边，避免车轮像悬浮 */
    const contacts = m.wheels.map(([cx, , r]) =>
      `<ellipse cx="${cx}" cy="${GROUND}" rx="${(r * 0.95).toFixed(1)}" ry="2.3" fill="#061713" opacity=".34"/>`
    ).join("");
    const glass = m.glass.map((d) => `<path d="${d}" fill="url(#${uid}-glass)"/>`).join("");
    const glints = (m.glints || []).map((d) => `<path d="${d}" fill="#ffffff" opacity=".28"/>`).join("");

    const speed = motion ? `<g class="speedlines">
      <rect x="-16" y="58" width="22" height="3" rx="1.5" fill="#ffffff">
        <animate attributeName="x" values="-20;0;-20" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;.62;0" dur="1.5s" repeatCount="indefinite"/>
      </rect>
      <rect x="-18" y="74" width="15" height="3" rx="1.5" fill="#ffffff">
        <animate attributeName="x" values="-26;-8;-26" dur="1.9s" begin=".28s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;.5;0" dur="1.9s" begin=".28s" repeatCount="indefinite"/>
      </rect>
      <rect x="-14" y="90" width="24" height="3" rx="1.5" fill="#ffffff">
        <animate attributeName="x" values="-18;4;-18" dur="1.25s" begin=".5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;.44;0" dur="1.25s" begin=".5s" repeatCount="indefinite"/>
      </rect>
    </g>` : "";

    return `<svg class="carmodel" viewBox="-${pad} 0 ${320 + pad} ${VIEW_H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${m.label}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${uid}-body" x1="0.12" y1="0" x2="0.42" y2="1">
          <stop offset="0" stop-color="${p.top}"/>
          <stop offset="0.44" stop-color="${p.base}"/>
          <stop offset="1" stop-color="${p.shade}"/>
        </linearGradient>
        <linearGradient id="${uid}-glass" x1="0.1" y1="0" x2="0.6" y2="1">
          <stop offset="0" stop-color="${p.glass2}"/>
          <stop offset="0.55" stop-color="${p.glass}"/>
          <stop offset="1" stop-color="${p.glass}"/>
        </linearGradient>
        <linearGradient id="${uid}-rim" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stop-color="#fbfeff"/>
          <stop offset="0.48" stop-color="${p.rim}"/>
          <stop offset="1" stop-color="#8ea4b3"/>
        </linearGradient>
        <radialGradient id="${uid}-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#0c2f24" stop-opacity=".52"/>
          <stop offset="0.58" stop-color="#0c2f24" stop-opacity=".2"/>
          <stop offset="1" stop-color="#0c2f24" stop-opacity="0"/>
        </radialGradient>
      </defs>
      ${opts.shadow === false ? "" : `<ellipse cx="162" cy="${GROUND}" rx="128" ry="3.2" fill="url(#${uid}-shadow)"/>`}
      ${speed}
      <g${motion ? ' class="carbody"' : ""}>
        <path d="${m.body}" fill="url(#${uid}-body)"/>
        ${arches}
        <path d="${m.body}" fill="none" stroke="${p.deep}" stroke-width="1.3" opacity=".4"/>
        <path d="${m.roof}" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity=".42"/>
        ${glass}
        ${glints}
        ${tint(m.art, p)}
      </g>
      ${wheels}
      ${contacts}
    </svg>`;
  }

  function modelLabel(key) {
    return (MODELS[key] || MODELS.suv).label;
  }
  function paintLabel(key) {
    return (PAINTS[key] || PAINTS.pearl).label;
  }
  function normalize(style) {
    const s = style || {};
    return {
      body: MODELS[s.body] ? s.body : "suv",
      paint: PAINTS[s.paint] ? s.paint : "pearl",
    };
  }

  global.YCCar = { carSvg, MODELS, PAINTS, ORDER, modelLabel, paintLabel, normalize };
})(window);
