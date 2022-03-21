#version 330 core

uniform Data {
    vec3 c;
    vec2 view_scale;
    float cosTheta;
    float sinTheta;
    float cosPhi;
    float sinPhi;
};

out vec3 ray;

void main() {
    vec2 uv = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    vec4 out_uv = vec4(uv * vec2(2, -2) + vec2(-1, 1), 0, 1);

    ray = vec3(out_uv.xy * view_scale, 1);
    mat3 rotmat = mat3(
         cosTheta, sinPhi*sinTheta,  cosPhi*sinTheta,
                0, cosPhi,          -sinPhi,
        -sinTheta, sinPhi*cosTheta,  cosPhi*cosTheta
    );
    ray = ray*rotmat;

    gl_Position = out_uv;
}

mat3 rotmat = mat3(
               cosTheta,       0,       -sinTheta,
        sinPhi*sinTheta,  cosPhi, sinPhi*cosTheta,
        cosPhi*sinTheta, -sinPhi, cosPhi*cosTheta
    );