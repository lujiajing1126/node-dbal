var gulp = require('gulp');
var mocha = require('gulp-mocha');
var _ = require('lodash');
var watchify = require('watchify');

var paths = {
    libs: './lib/**/*.js',
};

function watch() {
    gulp.watch(paths.libs, mocha_test);
};

function mocha_test() {
    return gulp.src('./test/*.js')
        .pipe(mocha());
};

var build = gulp.series(watch, mocha_test);

exports.test = mocha_test;
exports.default = build;
