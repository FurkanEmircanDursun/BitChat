# BitChat design

## Direction
The user delegated visual decisions. Seven viable sources were considered: civil-defense field sheets, neighborhood noticeboards, transit wayfinding, outdoor equipment labels, civic service terminals, search-team field handbooks, and community supply ledgers. The assigned sixth source is the search-team field handbook: clear chapter navigation, large imperative actions, strong rescue-orange markers, and a readable map plate. Catalog challengers with narrow type or decorative geometry reduce product clarity in emergency use; the handbook supplies better task clarity and audience fit.

## Physical scene
A person outdoors, possibly in bright sunlight or at night, operating a phone with one hand. Default light parchment and dark forest ink; an explicit dark theme plus true-black low-battery option.

## Tokens
Surface #F5F6F0; card #FFFFFF; ink #193C34; muted #53685E; primary #285E49; primary-container #E3EDDF; rescue orange #C54822; error #B52E35; outline #D9E1D6. Semantic colors retain text labels. Android system Roboto for legibility, 32/28 headline, 20 title, 16 body, 13 label. Spacing 4/8/12/16/24/32. Panels 16 dp radius. Targets at least 48 dp.

## Surface / operate
Five destinations: overview, messages, map, solidarity, network. Compact bottom navigation; wide screens navigation rail. The overview begins with a greeting and honest local-network state, then one strong SOS surface, a context map plate, and recent messages. No fake live peers or official help points. Empty states suggest a useful next action. Local exercise has a persistent label and isolated data.

## Interaction
SOS uses a focused review sheet before saving and queuing. Messages show local, queued and peer-received states distinctly. Map supports pan, zoom, point selection and user-added coordinates. Network offers device diagnostics, peer confirmation codes and a deterministic store-and-forward exercise. System Back closes sheets then returns to overview. Theme honors platform dark preference with a user override. Motion is limited to tactile press feedback and network-exercise progression, respecting reduced motion.
