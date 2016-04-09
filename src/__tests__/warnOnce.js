import warnOnce from '../lib/warnOnce';
import ava from 'ava';
import hookStd from 'hook-std';

ava('should output a warning only once', t => {
    let out = '';

    const unhook = hookStd.stderr({silent: true}, output => out += output);
    
    warnOnce('once');
    warnOnce('once');
    
    unhook();
    
    t.deepEqual(out.trim(), 'once');
});
