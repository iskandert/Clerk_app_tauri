import { expect } from 'chai';
import {
    getIsNormalDistribution,
    getStandardDeviation,
    getPearsonCorrelation,
    getSmirnovStatistic,
    getLinearRegression
} from '../src/services/analize.js';

describe('Analysis module', function() {
    
    describe('getIsNormalDistribution', function() {
        it('should return true for normal distribution', function() {
            const data = [1.23, 2.34, 3.45, 2.34, 1.23];
            const result = getIsNormalDistribution(data);
            expect(result.isNormal).to.be.true;
        });

        it('should return false for non-normal distribution', function() {
            const data = [1,1,1,1,1,1];
            const result = getIsNormalDistribution(data);
            expect(result.isNormal).to.be.false;
        });

        it('should return false for empty array', function() {
            const data = [];
            const result = getIsNormalDistribution(data);
            expect(result.isNormal).to.be.false;
        });
    });

    describe('getStandardDeviation', function() {
        it('should return standard deviation of data', function() {
            const data = [1, 2, 3, 4, 5];
            const result = getStandardDeviation(data);
            expect(result).to.be.closeTo(1.41, 0.01);
        });

        it('should return 0 for empty array', function() {
            const data = [];
            const result = getStandardDeviation(data);
            expect(result).to.equal(0);
        });
    });

    describe('getPearsonCorrelation', function() {
        it('should return positive correlation', function() {
            const dataX = [1, 2, 3];
            const dataY = [2, 4, 6];
            const result = getPearsonCorrelation(dataX, dataY);
            expect(result.k).to.be.closeTo(1, 0.01);
        });

        it('should return no correlation', function() {
            const dataX = [1, 2, 3];
            const dataY = [5, 100, 3];
            const result = getPearsonCorrelation(dataX, dataY);
            expect(result.k).to.be.closeTo(0, 0.02);
        });
    });

    describe('getSmirnovStatistic', function() {
        it('should calculate Kolmogorov-Smirnov statistic', function() {
            const matrix = {
                row1: { col1: 10, col2: 20 },
                row2: { col1: 30, col2: 40 },
            };
            const result = getSmirnovStatistic(matrix);
            expect(result.gammaN).to.be.greaterThan(0);
        });
    });

    describe('getLinearRegression', function() {
        it('should calculate linear regression', function() {
            const coordsList = [
                { x: 1, y: 2 },
                { x: 2, y: 4 },
                { x: 3, y: 6 },
            ];
            const result = getLinearRegression(coordsList, 1);
            expect(result.r_2).to.be.closeTo(1, 0.01);
        });
    });

});
