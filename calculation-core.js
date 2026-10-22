/* Pure calculation helpers shared by the UI and smoke tests. */
(function (window) {
    'use strict';

    const UNIT_TO_MCG = { g: 1000000, mg: 1000, mcg: 1 };

    function baseUnit(unit) {
        return String(unit || '').trim().toLowerCase().replace(/[µμ]g/g, 'mcg').split('/')[0];
    }

    function positive(value) {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) throw new Error('invalid-infusion-values');
        return n;
    }

    function doseParts(unit) {
        const s = String(unit || '').toLowerCase().replace(/[µμ]g/g,'mcg').replace(/\s+/g,'').replace(/\/(?:hour|hr)$/,'/h').replace(/\/minute$/,'/min');
        const match = s.match(/^(g|mg|mcg|units)(\/kg)?\/(h|min)$/);
        if (!match) throw new Error('incompatible-dose-units');
        return {base:match[1],weighted:!!match[2],perMinute:match[3]==='min',unit:s};
    }

    function convertAmount(value, from, to) {
        const n = positive(value), a = baseUnit(from), b = baseUnit(to);
        if (a !== b && (!(a in UNIT_TO_MCG) || !(b in UNIT_TO_MCG))) throw new Error('incompatible-dose-units');
        if (!['g','mg','mcg','units'].includes(a) || !['g','mg','mcg','units'].includes(b)) throw new Error('incompatible-dose-units');
        return positive(a===b?n:n*UNIT_TO_MCG[a]/UNIT_TO_MCG[b]);
    }

    function convertDose(value, from, to, weight) {
        const a=doseParts(from), b=doseParts(to);
        let n=convertAmount(value,a.base,b.base)*(a.perMinute?60:1);
        if(a.weighted)n*=positive(weight);
        if(b.weighted)n/=positive(weight);
        return positive(n/(b.perMinute?60:1));
    }

    function infusionRate(options) {
        const p=doseParts(options.doseUnit);
        let perHour=convertAmount(options.dose,p.base,options.drugUnit)*(p.perMinute?60:1);
        if(p.weighted)perHour*=positive(options.weight);
        return positive(perHour/(positive(options.totalDrug)/positive(options.solutionVolume)));
    }

    function reverseInfusionDose(options) {
        const pumpRate = positive(options.pumpRate);
        const totalDrug = positive(options.totalDrug);
        const solutionVolume = positive(options.solutionVolume);
        const doseUnit = String(options.doseUnit || '');
        const drugUnit = baseUnit(options.drugUnit);
        const target = doseParts(doseUnit), targetUnit = target.base;

        if (!(pumpRate > 0) || !(totalDrug > 0) || !(solutionVolume > 0)) {
            throw new Error('invalid-infusion-values');
        }

        let dosePerHour = convertAmount(pumpRate * (totalDrug / solutionVolume),drugUnit,targetUnit);

        let dose = doseUnit.toLowerCase().includes('/min') ? dosePerHour / 60 : dosePerHour;
        if (doseUnit.toLowerCase().includes('/kg')) {
            const weight = Number(options.weight);
            if (!(weight > 0)) throw new Error('weight-required');
            dose /= weight;
        }
        return positive(dose);
    }

    function humptyDumptyRisk(scores) {
        const values = Array.isArray(scores) ? scores.map(Number) : [];
        if (values.length !== 7 || values.some(value => !Number.isInteger(value) || value < 1 || value > 4)) {
            throw new Error('invalid-humpty-dumpty-scores');
        }

        const total = values.reduce((sum, value) => sum + value, 0);
        if (total < 7 || total > 23) throw new Error('invalid-humpty-dumpty-total');
        return Object.freeze({
            total,
            level: total >= 12 ? 'high' : 'low'
        });
    }

    window.FoxiCalcCore = Object.freeze({ reverseInfusionDose, infusionRate, convertAmount, convertDose, doseParts, humptyDumptyRisk });
})(window);
