# Threads demonstration

`fixture.ts` defines 12 dated events, one undated event, 20 original participants (Characters, Items, Affiliations and Systems), four Locations and ten local image assets. Every participant occurs in 2–5 events, counting the undated example. It includes spanning events, simultaneous appearances and an undated predecessor chain.

Create the isolated native fixture with `node --experimental-strip-types scripts/create-threads-fixture.ts`. This writes only below `.preview/Marginalia Test Vault/Threads Demo`; it does not overwrite differing files. `--refresh-owned` may refresh fixture notes only when their bytes match the prior fixture manifest. The generator validates all participant counts and records note hashes in `.preview/threads-fixture-manifest.json`.

The existing `Timeline Demo/Calendar` is used through the plain-text Calendar property. Icon examples use `icon: "[[Threads Demo/Assets/marker-01.svg]]"`; Dara Wren deliberately points to a missing image, and other participants have no icon. Both should use initials. Assets are simple local SVG test portraits.

The browser preview's **Threads fixture** button loads the same note definitions using its Calendar. The browser icon resolver supplies equivalent SVG data URLs only for this synthetic harness. Production resolves existing vault image files through Obsidian's resource API.
