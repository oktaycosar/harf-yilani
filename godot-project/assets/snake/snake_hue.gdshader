shader_type canvas_item;

// Yılan sprite'ının rengini hue-shift ile değiştirir.
// Amaç: tek bir sprite sheet ile 5 skin + boost (altın) + buz (mavi) durumlarını
// gösterebilmek.
//
// Korunanlar:
//   - kırmızı dil  (hue ~0.99)  -> kaydırma bandının dışında, değişmez
//   - beyaz göz    (doygunluk 0) -> hue kaydırması etkilemez
//   - siyah kontur (koyu, doygunluğu düşük) -> neredeyse sabit kalır

uniform float hue_shift : hint_range(0.0, 1.0) = 0.0;

vec3 rgb2hsv(vec3 c) {
	vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
	vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
	vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
	float d = q.x - min(q.w, q.y);
	float e = 1.0e-10;
	return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
	vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
	vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
	return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void fragment() {
	vec4 tex = texture(TEXTURE, UV);
	vec3 hsv = rgb2hsv(tex.rgb);

	// Sadece GÖVDE YEŞİLİ bandını kaydır.
	// Kit paletinde: gövde #94c75d (hue 0.247) kaydırılır;
	// krem #eff9a3 (hue 0.186), koyu kontur #346454 (hue 0.444), dil/pembe ve
	// beyaz göz korunur.
	if (hsv.x > 0.20 && hsv.x < 0.42 && hsv.y > 0.12) {
		hsv.x = fract(hsv.x + hue_shift);
	}

	// NOT: MODULATE bu bağlamda tanımlı değil (Godot 4.7 canvas_item fragment).
	// Sprite'larda modulate kullanılmadığı için doğrudan yazmak yeterli.
	COLOR = vec4(hsv2rgb(hsv), tex.a);
}
