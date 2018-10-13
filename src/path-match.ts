import * as pathToRegexp from "path-to-regexp";
// Based on the code from https://github.com/pillarjs/path-match
export default function pathMatch(fromPath: string) {
  const keys: pathToRegexp.Key[] = [];
  const re = pathToRegexp(fromPath, keys);
  function extractor(path: string) {
    const matches = re.exec(path);
    if (!matches) return { params: null, matches: false };
    let foundParams = false;
    const params = keys.reduce(
      (params, key, ind) => {
        const param = matches[ind + 1];
        if (!param) return params;
        params[key.name] = decodeParam(param);
        if (key.repeat) {
          params[key.name] = params[key.name].split(key.delimiter);
        }
        foundParams = true;
        return params;
      },
      {} as { [key: string]: any }
    );
    return { params: foundParams ? params : null, matches: true };
  }
  return { extractor, keys, re };
}

function decodeParam(param: string) {
  try {
    return decodeURIComponent(param);
  } catch (err) {
    return param;
  }
}
