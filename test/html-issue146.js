import * as chai from "chai";
import syntax from "../lib/index.js";

// https://github.com/ota-meshi/postcss-html/issues/146
describe("issue 146 test", () => {
	it("should not fail when you call `toJSON()`", () => {
		const document = syntax.parse("```css\na {}\n```", {
			from: `/test.md`,
		});
		document.toJSON();
		chai.expect(document.nodes[0].document).to.equal(document);
	});
});
