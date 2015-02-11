module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-contrib-stylus');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-html2js');

  grunt.registerTask(
    'scripts',
    'Compiles and concat the javaScript, coffescript and templates files.',
    ['copy:js', 'coffee', 'html2js', 'concat', 'clean:temp']
  );

  grunt.registerTask(
    'stylesheets',
    'Compiles the stylesheets.',
    ['stylus']
  );

  grunt.registerTask(
    'build',
    'Compiles all of the assets and copies the files to the build directory.',
    ['clean', 'scripts', 'stylesheets', 'copy:assets']
  );

  // Default task.
  grunt.registerTask('default', ['build', 'connect', 'watch']);

  // Print a timestamp (useful for when watching)
  grunt.registerTask('timestamp', function() {
    grunt.log.subhead(Date());
  });

  // Project configuration.
  grunt.initConfig({
    distdir: 'dist',
    tempdir: 'build',
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*!\n'+
      ' * <%= pkg.title || pkg.name %>\n' +
      ' * @version v<%= pkg.version %> \n' +
      ' * @link <%= pkg.homepage %> \n' +
      ' * @author <%= pkg.author %>\n' +
      ' * @license <%= pkg.license %>\n */\n',
    src: {
      js: [
        'src/app/**/**/*.js',
        'src/common/**/*.js'
      ],
      coffee: [
        'src/**/**/*.coffee'
      ],
      jsTpl: ['<%= distdir %>/templates/**/*.js'],
      tpl: {
        app: ['src/app/**/*.tpl.html'],
        common: ['src/common/**/*.tpl.html']
      },
      stylus: ['dist/stylesheets/**/*.styl']
    },
    clean: {
      options: {force: true},
      temp: ['<%= tempdir %>'],
      //release: ['<%= distdir %>/*'],
    },
    copy: {
      assets: {
        files: [
          { dest: '<%= distdir %>', src: '**', expand: true, cwd: 'src/assets/' }
        ]
      },
      js: {
        files: [
          { dest: '<%= tempdir %>', src: '**/*.js', expand: true, cwd: 'src/' }
        ]
      }
    },
    html2js: {
      app: {
        options: {
          base: 'src/app'
        },
        src: ['<%= src.tpl.app %>'],
        dest: '<%= tempdir %>/templates/app.js',
        module: 'templates.app'
      },
      common: {
        options: {
          base: 'src/common'
        },
        src: ['<%= src.tpl.common %>'],
        dest: '<%= tempdir %>/templates/common.js',
        module: 'templates.common'
      }
    },
    concat: {
      dist: {
        options: {
          banner: "<%= banner %>"
        },
        src: ['<%= tempdir %>/**/*.js', '<%= src.jsTpl %>'],
        dest: '<%= distdir %>/<%= pkg.name %>.js'
      }
    },
    coffee: {
      build: {
        expand: true,
        cwd: 'src',
        src: [ '**/*.coffee' ],
        dest: '<%= tempdir %>',
        ext: '.js'
      }
    },
    stylus: {
      build: {
        options: {
          compress: false
        },
        files: [
          {
            expand: true,
            cwd: '<%= distdir %>',
            src: [ 'stylesheets/stylus/dvhb-calendar.styl' ],
            dest: '<%= distdir %>',
            ext: '.css'
          }
        ]
      }
    },
    connect: {
      server: {
        options: {
          port: 4000,
          base: ['dist'],
          hostname: '*',
          open: {
            target: 'http://0.0.0.0:4000/docs'
          }
        }
      }
    },
    uglify: {
      dist: {
        options: {
          banner: "<%= banner %>",
          mangle: false
        },
        src: ['<%= src.js %>' , '<%= src.jsTpl %>'],
        dest: '<%= distdir %>/<%= pkg.name %>.js'
      }
    },
    jshint: {
      files: ['gruntFile.js', '<%= src.js %>'],
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        boss: true,
        eqnull: true,
        globals: {}
      }
    },
    watch: {
      all: {
        files: ['<%= src.stylus %>', '<%= src.coffee %>', '<%= src.js %>', '<%= src.tpl.app %>', '<%= src.tpl.common %>'],
        tasks: ['build', 'timestamp']
      }
    }
  });

};
