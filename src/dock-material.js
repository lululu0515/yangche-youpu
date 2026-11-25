/* The browser samples the live page underneath the two glass surfaces. This small
   transparent WebGL layer refracts the actual navigation artwork during a gesture. */
const dockMaterial = (() => {
  const canvas = document.getElementById("dock-ink");
  const bar = canvas.parentElement;
  const fabCutout = document.getElementById("fab-cutout");
  const vertex = `
    attribute vec2 vertex;
    varying vec2 point;
    void main() {
      point = vec2(-12.0, -22.0) + vec2(388.0, 112.0) * vertex;
      gl_Position = vec4(vertex.x * 2.0 - 1.0, 1.0 - vertex.y * 2.0, 0.0, 1.0);
    }`;
  const fragment = `
    precision highp float;
    varying vec2 point;
    uniform sampler2D atlas;
    uniform vec2 center;
    uniform vec2 deformation;
    uniform float morph;

    vec4 ink(vec2 p, bool selected) {
      if (p.x < 0.0 || p.y < 0.0 || p.x > 364.0 || p.y > 68.0) return vec4(0.0);
      vec4 s = texture2D(atlas, p / vec2(364.0, 68.0));
      if (p.x < 154.0 || p.x > 210.0) {
        vec3 pigment = selected ? vec3(.082,.604,.325) : vec3(.043,.059,.090);
        s.rgb = mix(pigment, vec3(1.0), s.r);
      }
      return vec4(s.rgb * s.a, s.a);
    }
    void main() {
      vec2 local = (point - center) / deformation;
      float radius = mix(29.0, 40.0, morph);
      vec2 radial = vec2(sign(local.x) * max(abs(local.x) - mix(8.0,7.0,morph),0.0), local.y);
      float dist = length(radial) - radius;
      // The SVG button paints its own pixels outside the optical surface.
      vec4 outside = point.x >= 154.0 && point.x <= 210.0 ? vec4(0.0) : ink(point, false);
      if (dist >= .7) { gl_FragColor = outside; return; }
      vec2 norm = radial / max(length(radial), .001);
      float rim = smoothstep(-20.0, 0.0, dist);
      vec2 base = point - (.075 * (point-center) + norm * (32.55 * pow(rim,1.85))) * morph;
      vec2 spread = norm * (7.04 * pow(rim,1.45) * morph);
      vec4 red = ink(base + spread * 1.15,true);
      vec4 orange = ink(base + spread * .65,true);
      vec4 yellow = ink(base + spread * .20,true);
      vec4 green = ink(base - spread * .20,true);
      vec4 cyan = ink(base - spread * .70,true);
      vec4 blue = ink(base - spread * 1.25,true);
      vec3 rgb = vec3(.50*red.r+.35*orange.r+.15*yellow.r,
                      .12*orange.g+.28*yellow.g+.38*green.g+.22*cyan.g,
                      .30*cyan.b+.70*blue.b);
      vec3 coverage = vec3(.50*red.a+.35*orange.a+.15*yellow.a,
                           .12*orange.a+.28*yellow.a+.38*green.a+.22*cyan.a,
                           .30*cyan.a+.70*blue.a);
      float a = max(coverage.r,max(coverage.g,coverage.b));
      vec4 spectral = vec4(rgb + a - coverage, a);
      // Let the specular reflection wash out the ink only at the curved rim.
      spectral *= .90 * (1.0 - .58 * pow(rim,2.6));
      vec4 inside = mix(ink(point,true),spectral,morph);
      gl_FragColor = mix(inside,outside,smoothstep(-.7,.7,dist));
    }`;

  let renderer, unit = 1, resolution = 0, lastPose, scheduled = false, enabled = false;
  const textureImage = new Image();
  function prepareArtwork() {
    const icons = [], symbols = [];
    for (const tab of bar.querySelectorAll(".tab")) {
      const tabX = (tab.offsetLeft + tab.offsetWidth/2) / unit;
      const href = tab.querySelector(".ico--fill use").getAttribute("href");
      symbols.push(document.querySelector(href).outerHTML);
      const label = tab.querySelector(".tab__t").textContent.trim();
      icons.push(`<use href="${href}" x="${tabX-12}" y="13" width="24" height="24"/>
        <text x="${tabX}" y="49" text-anchor="middle" dominant-baseline="central">${label}</text>`);
    }
    const font = getComputedStyle(bar).fontFamily.replaceAll('"',"'");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1092" height="204" viewBox="0 0 364 68">
      <defs>${symbols.join("")}${document.getElementById("fab-gradient").outerHTML}${document.getElementById("fab-art").outerHTML}</defs>
      <g font-family="${font}" font-size="11.5" font-weight="600" color="black">${icons.join("")}</g>
      <use href="#fab-art" x="155" y="12" width="54" height="44"/></svg>`;
    textureImage.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  function init() {
    if (!enabled || renderer || canvas.isConnected === false) return;
    const gl = canvas.getContext("webgl", {alpha:true, antialias:false, depth:false, stencil:false,
      premultipliedAlpha:true, powerPreference:"low-power"});
    if (!gl || gl.isContextLost()) return;
    const program = gl.createProgram();
    for (const [kind,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
      const shader = gl.createShader(kind);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) { gl.deleteProgram(program); return; }
    gl.useProgram(program);
    const pos = gl.getAttribLocation(program,"vertex");
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,quad);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,1,1]),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,texture);
    for (const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
    for (const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,textureImage);
    renderer = {gl,center:gl.getUniformLocation(program,"center"),deform:gl.getUniformLocation(program,"deformation"),
      morph:gl.getUniformLocation(program,"morph")};
    resolution = 0;
    if (lastPose) draw(lastPose);
  }
  textureImage.onload = init;
  canvas.addEventListener("webglcontextlost",event => {
    event.preventDefault(); renderer = null; bar.classList.remove("ink-on");
  });
  canvas.addEventListener("webglcontextrestored",init);

  function clipFab(pose) {
    // Match the shader's stretched stadium in the button's 54 × 44 coordinate space.
    const radius = 29 + 11*pose.morph;
    const stretchX = 1 + pose.stretch, stretchY = 1 - .45*pose.stretch;
    const straight = (8-pose.morph)*stretchX;
    const overlaps = Math.abs(pose.x-182) < 27+straight+radius*stretchX &&
      Math.abs(pose.y) < 22+radius*stretchY;
    bar.classList.toggle("lens-over-fab",overlaps);
    if (!overlaps) return;
    const rx = radius*stretchX/54, ry = radius*stretchY/44;
    const x = (pose.x-155-straight)/54, top = (22+pose.y)/44-ry;
    const span = 2*straight/54;
    fabCutout.setAttribute("d",`M0 0H1V1H0Z M${x} ${top}h${span}a${rx} ${ry} 0 0 1 0 ${2*ry}h${-span}a${rx} ${ry} 0 0 1 0 ${-2*ry}Z`);
  }
  function draw(pose) {
    lastPose = pose;
    const visible = enabled && renderer && pose.morph > .005;
    bar.classList.toggle("ink-on",Boolean(visible));
    if (!visible) return;
    clipFab(pose);
    const density = Math.min(window.devicePixelRatio || 1, bar.classList.contains("lite-optics") ? 1.25 : 2) * unit;
    const {gl,center,deform,morph} = renderer;
    if (density !== resolution) {
      canvas.width = Math.max(1,Math.round(388*density));
      canvas.height = Math.max(1,Math.round(112*density));
      gl.viewport(0,0,canvas.width,canvas.height);
      resolution = density;
    }
    gl.uniform2f(center,pose.x,34+pose.y);
    gl.uniform2f(deform,1+pose.stretch,1-pose.stretch*.45);
    gl.uniform1f(morph,pose.morph);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  function resize(size,allowGlass) {
    unit = size;
    enabled = allowGlass;
    for (const [id,w,h] of [["dock-body-optics",364,68],["lens-optics",94,80]]) {
      const filter = document.getElementById(id);
      for (const node of [filter,filter.querySelector("feImage")]) {
        node.setAttribute("width", w*unit); node.setAttribute("height", h*unit);
      }
      filter.querySelector("feDisplacementMap").setAttribute("scale",88*unit);
    }
    if (enabled && !scheduled) {
      scheduled = true;
      if (window.requestIdleCallback) requestIdleCallback(prepareArtwork,{timeout:600});
      else setTimeout(prepareArtwork,0);
    } else if (enabled && textureImage.naturalWidth && !renderer) init();
    if (lastPose) draw(lastPose);
  }
  return {resize,draw};
})();
