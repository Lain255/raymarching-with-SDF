#include <stdio.h>
#include <stdlib.h>
#include <cmath>

#include <glad/glad.h>
#include <GLFW/glfw3.h>

static void error_callback(int error, const char *description)
{
    fprintf(stderr, "Error: %s\n", description);
}

char *read_file(char *path)
{
    FILE *fp = fopen(path, "rb");

    if (fp == 0)
    {
        printf("Could not find file: \"%s\"\n", path);
        exit(-1);
    }

    long size;
    char *text;

    fseek(fp, 0L, SEEK_END);
    size = ftell(fp);
    rewind(fp);

    text = (char *) malloc(size * sizeof(char)+1);
    

    fread(text, 1, size, fp);
    text[size] = 0;

    fclose(fp);

    return text;
}

int main()
{
    GLFWwindow *window;

    glfwSetErrorCallback(error_callback);

    glfwInit();

    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    window = glfwCreateWindow(800, 600, "ComplexDynamics", 0, 0);

    // glad_set_post_callback(_post_call_callback_default);

    glfwMakeContextCurrent(window);
    gladLoadGL();
    glfwSwapInterval(1);
    glfwSetInputMode(window, GLFW_CURSOR, GLFW_CURSOR_DISABLED);
    if (glfwRawMouseMotionSupported()) {
        glfwSetInputMode(window, GLFW_RAW_MOUSE_MOTION, GLFW_TRUE);
    }

    GLuint vertex_array_id;
    glGenVertexArrays(1, &vertex_array_id);
    glBindVertexArray(vertex_array_id);

    // OpenGL resource initialization
    const char *vertex_shader_text = read_file("shaders/ComplexDynamics.vert");
    const char *fragment_shader_text = read_file("shaders/ComplexDynamics.frag");
    printf("%s\n", vertex_shader_text);
    printf("%s\n", fragment_shader_text);

    int  success;
    char infoLog[512];
    
    const GLuint vertex_shader = glCreateShader(GL_VERTEX_SHADER);
    glShaderSource(vertex_shader, 1, &vertex_shader_text, 0);
    glCompileShader(vertex_shader);
    glGetShaderiv(vertex_shader, GL_COMPILE_STATUS, &success);
    if(!success) {
        glGetShaderInfoLog(vertex_shader, 512, NULL, infoLog);
        printf("ERROR::SHADER::VERTEX::COMPILATION_FAILED\n%s\n", infoLog);
    }

    const GLuint fragment_shader = glCreateShader(GL_FRAGMENT_SHADER);
    glShaderSource(fragment_shader, 1, &fragment_shader_text, 0);
    glCompileShader(fragment_shader);
    glGetShaderiv(fragment_shader, GL_COMPILE_STATUS, &success);
    if(!success) {
        glGetShaderInfoLog(fragment_shader, 512, NULL, infoLog);
        printf("ERROR::SHADER::FRAGMENT::COMPILATION_FAILED\n%s\n", infoLog);
    }

    const GLuint program = glCreateProgram();
    glAttachShader(program, vertex_shader);
    glAttachShader(program, fragment_shader);
    glLinkProgram(program);
    glGetProgramiv(program, GL_LINK_STATUS, &success);
    if(!success) {
        glGetProgramInfoLog(program, 512, NULL, infoLog);
        printf("ERROR::PROGRAM::LINKING_FAILED\n%s\n", infoLog);
    }

    typedef struct Data_s{
        float cx;
        float cy;
        float cz;
        float MOREMOREJUNK;

        float view_scale_x;
        float view_scale_y;

        float cosTheta;
        float sinTheta;
        float cosPhi;
        float sinPhi;
    } Data;

    GLuint data_ubo;
    glGenBuffers(1, &data_ubo);
    glBindBufferRange(GL_UNIFORM_BUFFER, 0, data_ubo, 0, sizeof(Data));

    Data data = {0,0,0};
    float zoom = 1.0;
    float theta = 0;
    float phi = 0;
    double dtheta = 0;
    double dphi = 0;
    float foreward = 0;
    float right = 0;
    float up = 0;

    const float dt = 10.0/60.0;
    float turbo = 1.0;

    glfwSetCursorPos(window, 0, 0);
    while (!glfwWindowShouldClose(window))
    {
        //printf("A\n");
        turbo = 1.0;
        foreward = 0;
        right = 0;
        up = 0;
        if (glfwGetKey(window, GLFW_KEY_ESCAPE)) {
            glfwSetWindowShouldClose(window, GLFW_TRUE);
        }
        if (glfwGetKey(window, GLFW_KEY_LEFT_SHIFT)) {
            turbo = 2.0;
        }
        if (glfwGetKey(window, GLFW_KEY_W)) {
            foreward += turbo * zoom * dt;
        }
        if (glfwGetKey(window, GLFW_KEY_S)) {
            foreward -= turbo * zoom * dt;
        }
        if (glfwGetKey(window, GLFW_KEY_A)) {
            right -= turbo * zoom * dt;
        }
        if (glfwGetKey(window, GLFW_KEY_D)) {
            right += turbo * zoom * dt;
        }
        if (glfwGetKey(window, GLFW_KEY_Q)) {
            up -= turbo * zoom * dt;
        }
        if (glfwGetKey(window, GLFW_KEY_E)) {
            up += turbo * zoom * dt;
        }
        if (glfwGetKey(window, GLFW_KEY_EQUAL)) {
            zoom *= 1.05 + turbo/50;
        }
        if (glfwGetKey(window, GLFW_KEY_MINUS)) {
            zoom /= 1.05 + turbo/50;
        }
        glfwGetCursorPos(window, &dtheta, &dphi);
        glfwSetCursorPos(window, 0, 0);
        theta += dtheta / 1000;
        phi += dphi / 1000;

        int width, height;
        glfwGetFramebufferSize(window, &width, &height);
        data.view_scale_x = zoom * (float) width / (float) height;
        data.view_scale_y = zoom;
        data.cosTheta = cos(theta);
        data.sinTheta = sin(theta);
        data.cosPhi = cos(phi);
        data.sinPhi = sin(phi);

        data.cx +=  (foreward*data.cosPhi*data.sinTheta) + (up*data.sinPhi*data.sinTheta) +  (right*data.cosTheta);    
        data.cy += -(foreward*data.sinPhi)               + (up*data.cosPhi);
        data.cz +=  (foreward*data.cosPhi*data.cosTheta) + (up*data.sinPhi*data.cosTheta) + (-right*data.sinTheta);

        glViewport(0, 0, width, height);

        glClearColor(1.0f, 0.0f, 0.0f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        glUseProgram(program);

        glBindBuffer(GL_UNIFORM_BUFFER, data_ubo);
        glBufferData(GL_UNIFORM_BUFFER, sizeof(Data), &data, GL_STATIC_DRAW);

        glDrawArrays(GL_TRIANGLES, 0, 3);

        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    glfwDestroyWindow(window);
    glfwTerminate();

    return 0;
}