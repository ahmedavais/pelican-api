export type CountedDatabase = {
  db: D1Database;
  queriesExecuted: () => number;
};

const EXECUTING_METHODS = new Set<PropertyKey>(["run", "all", "first", "raw"]);

export function countingQueries(db: D1Database): CountedDatabase {
  let executed = 0;
  const realStatements = new WeakMap<D1PreparedStatement, D1PreparedStatement>();

  const counted = (statement: D1PreparedStatement): D1PreparedStatement => {
    const proxy = new Proxy(statement, {
      get(target, property) {
        const value = Reflect.get(target, property, target);
        if (property === "bind") {
          return (...values: unknown[]) => counted(target.bind(...values));
        }
        if (EXECUTING_METHODS.has(property)) {
          return (...args: unknown[]) => {
            executed += 1;
            return value.apply(target, args);
          };
        }
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    realStatements.set(proxy, statement);
    return proxy;
  };

  const database = new Proxy(db, {
    get(target, property) {
      if (property === "prepare") {
        return (query: string) => counted(target.prepare(query));
      }
      if (property === "batch") {
        return (statements: D1PreparedStatement[]) => {
          executed += statements.length;
          return target.batch(statements.map((statement) => realStatements.get(statement) ?? statement));
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

  return { db: database, queriesExecuted: () => executed };
}
