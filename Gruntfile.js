/*
 * tmtTinyPng
 * https://github.com/funfungo/myGrunt
 *
 * Copyright (c) 2014 
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    // Configuration to be run (and then tested).
    tmtTinyPng: {
      default_options: {
          options: {
          },
          files: [
              {
                  expand: true,
                  src: ['*.png','*.jpg','*/*.png','*/*.jpg'],
                  cwd: 'test/input',
                  filter: 'isFile'
              }
          ]
      }
    }
  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

};
