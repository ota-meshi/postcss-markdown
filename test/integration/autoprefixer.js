import path from "path";
import autoprefixer from "autoprefixer";
import * as chai from "chai";
import { jestSnapshotPlugin } from "mocha-chai-jest-snapshot";
import postcss from "postcss";
import syntax from "../../lib/index.js";
import { listupFixtures } from "../utils.js";

chai.use(jestSnapshotPlugin());

const FIXTURE_ROOT = path.resolve(
	import.meta.dirname,
	"../../test-fixtures/integration/autoprefixer",
);

describe("Integration with autoprefixer", () => {
	for (const { filename, content } of listupFixtures(FIXTURE_ROOT)) {
		describe(`autoprefixer with markdown`, () => {
			it(filename, () =>
				postcss([autoprefixer])
					.process(content, { syntax })
					.then(function (result) {
						const actual = result.content;
						chai.expect(actual).toMatchSnapshot();
					}),
			);
		});
	}
});
