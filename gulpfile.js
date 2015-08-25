var gulp = require('gulp');
var mocha = require('gulp-mocha');
var _ = require('lodash');
var watchify = require('watchify');

var paths = {
    libs: './lib/**/*.js',
};

gulp.task('watch', function () {
    gulp.watch([paths.libs], ['mocha-test']);
});

gulp.task('mocha-test', function () {
    return gulp.src('./test/*.js')
        .pipe(mocha());
});

gulp.task('default', ['mocha-test', 'watch']);
