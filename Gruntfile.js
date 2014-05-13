module.exports = function(grunt) {
    var jsFiles = 'src/app/**/*.js';
    var otherFiles = [
        'src/app/**/*.html',
        'src/app/**/*.css',
        'src/index.html'
    ];
    var gruntFile = 'GruntFile.js';
    var jshintFiles = [jsFiles, gruntFile];

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: jshintFiles
        },
        watch: {
            jshint: {
                files: jshintFiles,
                tasks: ['jshint']
            },
            src: {
                files: jshintFiles.concat(otherFiles),
                options: {
                    livereload: true
                }
            }
        },
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', ['jshint', 'watch']);
};