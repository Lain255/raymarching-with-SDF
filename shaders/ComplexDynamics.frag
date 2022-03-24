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

float proj(vec3 v, vec3 dir) {
    return dot(v,dir) / dot(dir,dir);
}
float SDF_point(vec3 v, vec3 p) {
    return length(p-v);
}
float SDF_line(vec3 v, vec3 p1, vec3 p2) {
    vec3 p12 = p2 - p1;
    vec3 p1v = v  - p1;
    return SDF_point(v, p1 + p12*clamp(proj(p1v, p12), 0, 1));
}
float SDF_triangle(vec3 v, vec3 p1, vec3 p2, vec3 p3) {
    vec3 p1v = v  - p1;
    vec3 p12 = p2 - p1;
    vec3 p13 = p3 - p1;
    float proj12 = clamp(proj(p1v, p12), 0, 1);
    float proj13 = clamp(proj(p1v, p13), 0, 1);
    
    //return SDF_point(v, p1 + p12*proj12 + p13*proj13);
    
    if (proj12 + proj13 > 1) {
        return SDF_line(v, p2, p3);
    }
    else {
        return SDF_point(v, p1 + p12*proj12 + p13*proj13);
    }
}

struct Sphere {
    vec3 pos;
    float radius;
};
float SDF_sphere(vec3 v, Sphere S) {
    return SDF_point(v,S.pos) - S.radius;
}

struct Pill {
    vec3 start;
    vec3 end;
    float radius;
};
float SDF_pill(vec3 v, Pill P) {
    return SDF_line(v, P.start, P.end) - P.radius;
}

struct Tetrahedron {
    vec3 p1;
    vec3 p2;
    vec3 p3;
    vec3 p4;
};
float SDF_tetrahedron(vec3 v, Tetrahedron T) {
    float minDist  = inf;
    minDist = min(minDist, SDF_triangle(v, T.p1, T.p2, T.p3));
    minDist = min(minDist, SDF_triangle(v, T.p2, T.p2, T.p4));
    minDist = min(minDist, SDF_triangle(v, T.p3, T.p1, T.p4));
    minDist = min(minDist, SDF_triangle(v, T.p2, T.p3, T.p4));

    //reletive positions
    vec3 p12 = T.p2 - T.p1;
    vec3 p13 = T.p3 - T.p1;
    vec3 p14 = T.p4 - T.p1;
    vec3 p23 = T.p3 - T.p2;
    vec3 p24 = T.p4 - T.p2;
    vec3 p1v = v - T.p1;
    vec3 p2v = v - T.p2;

    //normals
    vec3 n123 = cross(p12, p13);
    vec3 n124 = cross(p12, p14);
    vec3 n134 = cross(p13, p14);
    vec3 n234 = cross(p23, p24);

    //negate if inside
    bool inside = (dot(p1v, n123)*dot(p14,  n123) > 0) 
               && (dot(p1v, n124)*dot(p13,  n124) > 0) 
               && (dot(p1v, n134)*dot(p12,  n134) > 0) 
               && (dot(p2v, n234)*dot(-p12, n234) > 0);
    if(inside) {
        minDist = -minDist;
    }

    return minDist;
}


struct Light {
    vec3 pos;
    float brightness;
};
Light sun = Light(vec3(0, 0, 0), 10*10);




float SDF(vec3 v) {
    float junk;
    float minDist = inf;
    float thisDist = inf;

    vec3 modv = v;
    modv.x = modf(abs(modv.x/5), junk);
    modv.y = modf(abs(modv.y/5), junk);
    modv.z = modf(abs(modv.z/5), junk);
    modv *= 5;

    Sphere S = Sphere(vec3(2.5,2.5,2.5), 1);
    Pill P = Pill(vec3(-10,0,10), vec3(10,0,10), 3);
    Tetrahedron T = Tetrahedron(
        vec3(2,2,2),
        vec3(2,2,7),
        vec3(7,2,2),
        vec3(5,7,5)
    );
    //v += 0.1*vec3(sin(v.y), cos(v.z), sin(v.x*v.y));

    //modv += 0.1*vec3(sin(modv.y), cos(modv.z), sin(modv.x*modv.y));
    //minDist = min(minDist, SDF_sphere(v, S));
    //minDist = min(minDist, SDF_tetrahedron(v, T));
    //minDist = min(minDist, SDF_pill(v, P));
    //minDist = min(minDist, SDF_line(v, P.start, P.end));
    //minDist = min(minDist, SDF_triangle(v, T.p1, T.p2, T.p4));
    minDist = min(minDist, SDF_triangle(v, vec3(2,2,7), vec3(7,2,2), vec3(5,7,5)));

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



struct Ray {
    vec3 pos;
    vec3 dir;
    bool hit;
    vec3 norm;
};
int MAX_ITER = 100;
Ray marchRay(in Ray r) {
    float distTraveled = 0;
    float stepsize = SDF(r.pos);
    r.hit = false;

    
    if(stepsize < zero)
    {
        for(int i = 0; i < MAX_ITER; i++)
        {
            r.pos += stepsize*r.dir;
            distTraveled += stepsize;
            stepsize = SDF(r.pos);
            if (stepsize >= zero)
            {
                break;
            }

        }
    }
    

    for(int i = 0; i < MAX_ITER; i++)
    {
        r.pos += stepsize*r.dir;
        distTraveled += stepsize;

        stepsize = SDF(r.pos);

        if (stepsize < zero) {
            r.hit = true;
            r.norm = SDFnorm(r.pos);
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
            //debug line
            brightness = 1.0f;
            
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
