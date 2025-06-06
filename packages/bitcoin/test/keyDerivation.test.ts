import {
  deriveBip39Seed,
  deriveElectrumSeed,
  ChainType,
  deriveAccountRootKeyPair,
  deriveChildPublicKey,
  deriveChildKeyPair,
  getExtendedPubKeys
} from '../src/wallet/lib/common/keyDerivation';
import { AddressType } from '../src/wallet/lib/common/address';
import { Network } from '../src/wallet/lib/common/network';

// taken from https://github.com/trezor/python-mnemonic/blob/master/vectors.json
const trezorBip39vectors = [
  [
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
    'c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04'
  ],
  [
    'legal winner thank year wave sausage worth useful legal winner thank yellow',
    '2e8905819b8723fe2c1d161860e5ee1830318dbf49a83bd451cfb8440c28bd6fa457fe1296106559a3c80937a1c1069be3a3a5bd381ee6260e8d9739fce1f607'
  ],
  [
    'letter advice cage absurd amount doctor acoustic avoid letter advice cage above',
    'd71de856f81a8acc65e6fc851a38d4d7ec216fd0796d0a6827a3ad6ed5511a30fa280f12eb2e47ed2ac03b5c462a0358d18d69fe4f985ec81778c1b370b652a8'
  ],
  [
    'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong',
    'ac27495480225222079d7be181583751e86f571027b0497b5b5d11218e0a8a13332572917f0f8e5a589620c6f15b11c61dee327651a14c34e18231052e48c069'
  ],
  [
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon agent',
    '035895f2f481b1b0f01fcf8c289c794660b289981a78f8106447707fdd9666ca06da5a9a565181599b79f53b844d8a71dd9f439c52a3d7b3e8a79c906ac845fa'
  ],
  [
    'legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth useful legal will',
    'f2b94508732bcbacbcc020faefecfc89feafa6649a5491b8c952cede496c214a0c7b3c392d168748f2d4a612bada0753b52a1c7ac53c1e93abd5c6320b9e95dd'
  ],
  [
    'letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter always',
    '107d7c02a5aa6f38c58083ff74f04c607c2d2c0ecc55501dadd72d025b751bc27fe913ffb796f841c49b1d33b610cf0e91d3aa239027f5e99fe4ce9e5088cd65'
  ],
  [
    'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo when',
    '0cd6e5d827bb62eb8fc1e262254223817fd068a74b5b449cc2f667c3f1f985a76379b43348d952e2265b4cd129090758b3e3c2c49103b5051aac2eaeb890a528'
  ],
  [
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
    'bda85446c68413707090a52022edd26a1c9462295029f2e60cd7c4f2bbd3097170af7a4d73245cafa9c3cca8d561a7c3de6f5d4a10be8ed2a5e608d68f92fcc8'
  ],
  [
    'legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth title',
    'bc09fca1804f7e69da93c2f2028eb238c227f2e9dda30cd63699232578480a4021b146ad717fbb7e451ce9eb835f43620bf5c514db0f8add49f5d121449d3e87'
  ],
  [
    'letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic avoid letter advice cage absurd amount doctor acoustic bless',
    'c0c519bd0e91a2ed54357d9d1ebef6f5af218a153624cf4f2da911a0ed8f7a09e2ef61af0aca007096df430022f7a2b6fb91661a9589097069720d015e4e982f'
  ],
  [
    'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo vote',
    'dd48c104698c30cfe2b6142103248622fb7bb0ff692eebb00089b32d22484e1613912f0a5b694407be899ffd31ed3992c456cdf60f5d4564b8ba3f05a69890ad'
  ],
  [
    'ozone drill grab fiber curtain grace pudding thank cruise elder eight picnic',
    '274ddc525802f7c828d8ef7ddbcdc5304e87ac3535913611fbbfa986d0c9e5476c91689f9c8a54fd55bd38606aa6a8595ad213d4c9c9f9aca3fb217069a41028'
  ],
  [
    'gravity machine north sort system female filter attitude volume fold club stay feature office ecology stable narrow fog',
    '628c3827a8823298ee685db84f55caa34b5cc195a778e52d45f59bcf75aba68e4d7590e101dc414bc1bbd5737666fbbef35d1f1903953b66624f910feef245ac'
  ],
  [
    'hamster diagram private dutch cause delay private meat slide toddler razor book happy fancy gospel tennis maple dilemma loan word shrug inflict delay length',
    '64c87cde7e12ecf6704ab95bb1408bef047c22db4cc7491c4271d170a1b213d20b385bc1588d9c7b38f1b39d415665b8a9030c9ec653d75e65f847d8fc1fc440'
  ],
  [
    'scheme spot photo card baby mountain device kick cradle pact join borrow',
    'ea725895aaae8d4c1cf682c1bfd2d358d52ed9f0f0591131b559e2724bb234fca05aa9c02c57407e04ee9dc3b454aa63fbff483a8b11de949624b9f1831a9612'
  ],
  [
    'horn tenant knee talent sponsor spell gate clip pulse soap slush warm silver nephew swap uncle crack brave',
    'fd579828af3da1d32544ce4db5c73d53fc8acc4ddb1e3b251a31179cdb71e853c56d2fcb11aed39898ce6c34b10b5382772db8796e52837b54468aeb312cfc3d'
  ],
  [
    'panda eyebrow bullet gorilla call smoke muffin taste mesh discover soft ostrich alcohol speed nation flash devote level hobby quick inner drive ghost inside',
    '72be8e052fc4919d2adf28d5306b5474b0069df35b02303de8c1729c9538dbb6fc2d731d5f832193cd9fb6aeecbc469594a70e3dd50811b5067f3b88b28c3e8d'
  ],
  [
    'cat swing flag economy stadium alone churn speed unique patch report train',
    'deb5f45449e615feff5640f2e49f933ff51895de3b4381832b3139941c57b59205a42480c52175b6efcffaa58a2503887c1e8b363a707256bdd2b587b46541f5'
  ],
  [
    'light rule cinnamon wrap drastic word pride squirrel upgrade then income fatal apart sustain crack supply proud access',
    '4cbdff1ca2db800fd61cae72a57475fdc6bab03e441fd63f96dabd1f183ef5b782925f00105f318309a7e9c3ea6967c7801e46c8a58082674c860a37b93eda02'
  ],
  [
    'all hour make first leader extend hole alien behind guard gospel lava path output census museum junior mass reopen famous sing advance salt reform',
    '26e975ec644423f4a4c4f4215ef09b4bd7ef924e85d1d17c4cf3f136c2863cf6df0a475045652c57eb5fb41513ca2a2d67722b77e954b4b3fc11f7590449191d'
  ],
  [
    'vessel ladder alter error federal sibling chat ability sun glass valve picture',
    '2aaa9242daafcee6aa9d7269f17d4efe271e1b9a529178d7dc139cd18747090bf9d60295d0ce74309a78852a9caadf0af48aae1c6253839624076224374bc63f'
  ],
  [
    'scissors invite lock maple supreme raw rapid void congress muscle digital elegant little brisk hair mango congress clump',
    '7b4a10be9d98e6cba265566db7f136718e1398c71cb581e1b2f464cac1ceedf4f3e274dc270003c670ad8d02c4558b2f8e39edea2775c9e232c7cb798b069e88'
  ],
  [
    'void come effort suffer camp survey warrior heavy shoot primary clutch crush open amazing screen patrol group space point ten exist slush involve unfold',
    '01f5bced59dec48e362f2c45b5de68b9fd6c92c6634f44d6d40aab69056506f0e35524a518034ddc1192e1dacd32c1ed3eaa3c3b131c88ed8e7e54c49a5d0998'
  ]
];

describe('seed derivation', () => {
  it('deriveBip39Seed', () => {
    trezorBip39vectors.forEach(([mnemonic, expectedSeedHex]) => {
      const seed = deriveBip39Seed(mnemonic, 'TREZOR');
      expect(seed.toString('hex')).toBe(expectedSeedHex);
    });
  });

  it('deriveElectrumSeed', () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const expectedSeed =
      'b24af40d049942cb7e7ea70ce919f5e665782a751ee51fb372bb13b76b1bbca307bc4c12dca4baa037e7cfe915ff7bc02167abe97a5bdc2766f8878c54c59fc4';

    const seed = deriveElectrumSeed(mnemonic, '');
    expect(seed.toString('hex')).toBe(expectedSeed);
  });
});

// Vectors for key derivation generated with https://iancoleman.io/bip39/
describe('Key derivation', () => {
  it('deriveAccountRootKeyPair', () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const seed = deriveBip39Seed(mnemonic);
    const { pair, path } = deriveAccountRootKeyPair(seed, AddressType.Legacy, Network.Mainnet, 0);
    expect(path).toBe("m/44'/0'/0'");
    expect(pair.privateKey).toBe(
      'xprv9xpXFhFpqdQK3TmytPBqXtGSwS3DLjojFhTGht8gwAAii8py5X6pxeBnQ6ehJiyJ6nDjWGJfZ95WxByFXVkDxHXrqu53WCRGypk2ttuqncb'
    );
    expect(pair.publicKey).toBe(
      'xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj'
    );
  });

  it('deriveChildKeyPair', () => {
    const xpriv =
      'xprv9xpXFhFpqdQK3TmytPBqXtGSwS3DLjojFhTGht8gwAAii8py5X6pxeBnQ6ehJiyJ6nDjWGJfZ95WxByFXVkDxHXrqu53WCRGypk2ttuqncb';
    const { pair, path } = deriveChildKeyPair(xpriv, ChainType.External, 0);
    expect(path).toBe('m/0/0');

    expect(pair.privateKey.toString('hex')).toBe('e284129cc0922579a535bbf4d1a3b25773090d28c909bc0fed73b5e0222cc372');
    expect(pair.publicKey.toString('hex')).toBe('03aaeb52dd7494c361049de67cc680e83ebcbbbdbeb13637d92cd845f70308af5e');
  });

  it('deriveChildPublicKey', () => {
    const xpub =
      'xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj';
    const childPubKey = deriveChildPublicKey(xpub, ChainType.External, 0);
    expect(childPubKey.toString('hex')).toBe('03aaeb52dd7494c361049de67cc680e83ebcbbbdbeb13637d92cd845f70308af5e');
  });
});

// Vectors for key derivation generated with https://iancoleman.io/bip39/
describe('getExtendedPubKeys', () => {
  const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const seed = deriveBip39Seed(mnemonic);
  const account = 0;

  it('derives all supported xpubs for mainnet account 0', () => {
    const keys = getExtendedPubKeys(seed, account);
    expect(keys.mainnet.legacy).toBe(
      'xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj'
    );
    expect(keys.mainnet.nativeSegWit).toBe(
      'xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V'
    );
    expect(keys.mainnet.taproot).toBe(
      'xpub6BgBgsespWvERF3LHQu6CnqdvfEvtMcQjYrcRzx53QJjSxarj2afYWcLteoGVky7D3UKDP9QyrLprQ3VCECoY49yfdDEHGCtMMj92pReUsQ'
    );
    expect(keys.mainnet.segWit).toBe(
      'xpub6C6nQwHaWbSrzs5tZ1q7m5R9cPK9eYpNMFesiXsYrgc1P8bvLLAet9JfHjYXKjToD8cBRswJXXbbFpXgwsswVPAZzKMa1jUp2kVkGVUaJa7'
    );
    expect(keys.mainnet.electrumNativeSegWit).toBe(
      'xpub6BiChRN7aqq51RA7RnAmKhqKdGckPncrHWLrj1xoj6ZMfdMJ1dX4Ysh9V3yEhpFCpC3BapjR83xPKY693XXTEU6qgWU3qZs78WBHA15uhYf'
    );
  });
});
