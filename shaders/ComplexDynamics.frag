#version 330 core

uniform Data {
    vec3 c;
    vec2 view_scale;
    float cosTheta;
    float sinTheta;
    float cosPhi;
    float sinPhi;
};

in vec3 ray;

out vec4 out_color;

float inf = 100;
float zero = 1/inf;

struct Sphere {
    vec3 pos;
    float radius;
};
struct Cube {
    vec3 pos;
    float sideLength;
};
struct Light {
    vec3 pos;
    float brightness;
};
struct Ray {
    vec3 pos;
    vec3 dir;
    bool hit;
    vec3 norm;
};

Light sun = Light(vec3(0, 0, 0), 10*10);

float SDF_sphere(Sphere S, vec3 v) {
    return length(S.pos - v) - S.radius;
}
float SDF_cube(Cube C, vec3 v) {
    float x = abs(C.pos.x - v.x) - C.sideLength/2;
    float y = abs(C.pos.y - v.y) - C.sideLength/2;
    float z = abs(C.pos.z - v.z) - C.sideLength/2;
    return (x+y+z)/3;
}

float SDF(vec3 v) {
    float junk;
    float minDist = inf;
    float thisDist = inf;

    Sphere sphere = Sphere(vec3(2.5,2.5,2.5), 1);
    //v += 0.1*vec3(sin(v.y), cos(v.z), sin(v.x*v.y));
    vec3 modv = v;
    modv.x = modf(abs(modv.x/5), junk);
    modv.y = modf(abs(modv.y/5), junk);
    modv.z = modf(abs(modv.z/5), junk);
    modv *= 5;
    //modv += 0.1*vec3(sin(modv.y), cos(modv.z), sin(modv.x*modv.y));
    thisDist = SDF_sphere(sphere, modv);
    minDist = min(minDist, thisDist);

    return minDist;
}

vec3 SDFnorm(vec3 v) {
    vec3 dx = vec3(zero, 0, 0);
    vec3 dy = vec3(0, zero, 0);
    vec3 dz = vec3(0, 0, zero);
    vec3 normal = vec3(
        (SDF(v+dx) - SDF(v))*inf,
        (SDF(v+dy) - SDF(v))*inf,
        (SDF(v+dz) - SDF(v))*inf
    );
    return normalize(normal);
}

int MAX_ITER = 100;
Ray marchRay(in Ray r) {
    float distTraveled = 0;
    float stepsize = inf;
    r.hit = false;

    for(int i = 0; i < MAX_ITER; i++)
    {
        float stepsize = 0.8*SDF(r.pos);
        r.pos = r.pos + stepsize*r.dir;
        distTraveled += stepsize;
        if (stepsize < zero) {
            r.hit = true;
            r.norm = SDFnorm(r.pos);
            r.pos += 2*r.norm*zero;
            break;
        }

        if(distTraveled > inf) {
            break;
        }
    }


    return r;
}


void main() {
    float reflectfactor = 0.5;
    float brightness = 0;

    Ray start = Ray(c, normalize(ray), false, vec3(0,0,0));

    for (int i = 0; i < 1; i++) {
        Ray end = marchRay(start);
        if (end.hit) {
            vec3 toLight = sun.pos - end.pos;
            float distSquare = dot(toLight, toLight);
            toLight = normalize(toLight);
            end.dir = toLight;
            Ray lightCheck = marchRay(end);

            if (dot(lightCheck.pos - sun.pos, toLight) > 0)
            {
                float surfaceBrightness = max(0,sun.brightness*dot(toLight, end.norm)/distSquare);
                brightness += pow(reflectfactor, i)*surfaceBrightness;
            }
        
        
            end.dir = reflect(start.dir, end.norm);
            start = end;
        }

        
    }

    out_color = vec4(brightness, brightness, brightness, 1.0f);
}