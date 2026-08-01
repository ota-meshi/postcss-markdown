import { createRequire } from "module";
import path from "path";
import * as chai from "chai";
import { jestSnapshotPlugin } from "mocha-chai-jest-snapshot";
import stylelint from "stylelint";
import stylelintConfig from "stylelint-config-standard";
import { listupFixtures } from "../utils.js";

const customSyntax = createRequire(import.meta.url).resolve("../..");

chai.use(jestSnapshotPlugin());

const FIXTURE_ROOT = path.resolve(
	import.meta.dirname,
	"../../test-fixtures/integration/stylelint",
);

describe("Integration with stylelint", () => {
	for (const { filename, content } of listupFixtures(FIXTURE_ROOT)) {
		describe(`stylelint with markdown`, () => {
			it(filename, () =>
				stylelint
					.lint({
						code: content,
						codeFilename: filename,
						customSyntax,
						config: stylelintConfig,
					})
					.then((result) => {
						const actual = result.results[0].warnings;
						chai.expect(actual).toMatchSnapshot();
					}),
			);
		});
		describe(`stylelint --fix with markdown`, () => {
			it(filename, () =>
				stylelint
					.lint({
						code: content,
						codeFilename: filename,
						customSyntax,
						config: stylelintConfig,
						fix: true,
					})
					.then((result) => {
						const actual = result.output;
						chai.expect(actual).toMatchSnapshot();
					}),
			);
		});
	}
});
