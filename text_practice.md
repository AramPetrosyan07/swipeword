## Text Practice Page — Development Requirements

Implement the **Text Practice** page in my existing application.

**Important instructions:**

- Do NOT use MCP or any MCP tools.
- Do NOT test the application.
- Do NOT just explain what needs to be done.
- Actually implement the feature in code.
- Follow the existing project's architecture, components, styling, and conventions.
- Write clean, maintainable, production-quality code.
- Do not break any existing functionality.
- When everything described below has been implemented, simply tell me that the implementation is finished. I will test it myself.

---

### 1. Text Practice Entry

On the application's main page, there is a button called **"Text Practice"**.

When the user clicks it, open the **Text Practice page**.

The page should display a collection of story/text cards.

Each story card should contain:

- Story title
- Author name

The user should be able to select any story and open it.

There should also be a way to enter/add a custom story so the feature is not limited only to predefined stories.

---

### 2. Reading Mode

When a story is opened, the user should first see the **complete story normally**.

The user must be able to read the entire story before starting the exercise.

There should be a **"Skip"** button.

The Skip button starts the text-practice game.

---

### 3. Skip / Missing Words Game

When the user clicks **Skip**:

- Do NOT show the entire story anymore.
- Show only **four lines at a time**.
- These four lines represent the current exercise section.

For each of the four lines:

- Randomly select one or more words.
- Hide those selected words from the text.
- Keep the original positions of the missing words.
- The user should clearly see where each missing word belongs.

For example:

```text
The boy ____ to the store because he needed some ____.
After that, he ____ home before it started raining.
His mother was ____ for him at the door.
They ____ dinner together that evening.
```

The missing positions should visually indicate that a word needs to be placed there.

---

### 4. Available Words

Below the four lines, display all of the words that were removed from those four lines.

The words should be shuffled/randomized so the user cannot simply rely on their original order.

For example:

```text
[waiting]   [went]   [returned]   [bread]
```

The user must drag a word from the word bank and drop it into the correct missing position.

---

### 5. Drag and Drop

Implement proper **drag-and-drop functionality**.

The user should be able to:

1. Pick up a word from the word bank.
2. Drag it to a missing-word position.
3. Drop it there.
4. The application should determine whether the word is correct.

The original word and its expected position must be stored internally so the application can validate the answer.

---

### 6. Answer Validation

After a word is dropped:

#### Correct answer

If the word belongs in that position:

- Mark the answer as **correct**.
- Change the background of the placed word/answer area to **green**.
- Keep the word in its position.

#### Incorrect answer

If the word does not belong in that position:

- Mark the answer as **incorrect**.
- Change the background of the placed word/answer area to **red**.
- Keep the user's answer visible so they can see what they placed.

The application must not prevent the user from continuing because of an incorrect answer.

**Important:** Do not automatically remove the wrong answer unless that is necessary for the existing UI/UX. The user should be able to clearly see whether their placement was correct or incorrect.

---

### 7. Next Button

After the user has finished placing the words for the current four lines, there should be a **"Next"** button.

The Next button should allow the user to continue regardless of whether the answers were correct or incorrect.

When the user clicks **Next**:

- Move to the next four lines of the story.
- Hide random words from those new four lines.
- Generate the corresponding word bank below them.
- Reset the answer/drag-and-drop state for the new section.

Example:

```text
Section 1
Lines 1–4
↓
Next
↓
Section 2
Lines 5–8
↓
Next
↓
Section 3
Lines 9–12
↓
Next
↓
...
```

Continue this process until the user reaches the end of the story.

---

### 8. End of Story

When the user reaches the final four lines and completes that section, the **Next** button should no longer attempt to load another section.

Instead, show an appropriate completion state, for example:

**"Story completed!"**

You can reuse the application's existing UI patterns for completion screens/buttons if they already exist.

---

### 9. Important Logic Requirements

Make sure:

- The original story text is preserved.
- The story is divided into groups of exactly four lines whenever possible.
- The final group may contain fewer than four lines if the story does not divide evenly by four.
- Missing words are selected randomly for each exercise section.
- The selected words must actually exist in the corresponding text.
- Each missing position must know its correct answer.
- The word bank must contain the words removed from the current four lines.
- Words should be shuffled in the word bank.
- Each answer must be validated against its original position.
- Correct answers become green.
- Incorrect answers become red.
- The user can continue even with incorrect answers.
- Clicking Next loads the next section and resets the exercise state.
- The game continues until the entire story has been completed.
- The user must be able to return to normal reading mode/open another story without breaking the application state.

---

### 10. UI/UX

Keep the interface clean, simple, and intuitive.

The four-line exercise should be the main focus of the screen.

The structure should roughly be:

```text
              TEXT PRACTICE

        Story Title — Author

        ┌───────────────────────────────┐
        │ The boy ____ to the store...  │
        │ After that, he ____ home...   │
        │ His mother was ____ for him...│
        │ They ____ dinner together...  │
        └───────────────────────────────┘

        Available Words

        [went] [waiting] [returned] [bread]


                     [ Next ]
```

Use the project's existing design system and components wherever possible rather than creating an entirely separate visual style.

---

### 11. Code Quality

Implement this as a real working feature, not a prototype or mockup.

Requirements:

- Clean component structure.
- Clear state management.
- Reusable components where appropriate.
- Proper TypeScript types if the project uses TypeScript.
- No unnecessary dependencies.
- No hardcoded behavior that only works for one example story.
- The feature must work with different stories and different numbers of lines.
- Preserve existing application functionality.
- Handle edge cases such as short stories, final sections with fewer than four lines, and multiple missing words in the same line.

Do not provide me with a tutorial or explanation of how I could implement it.

**Implement the feature directly in the existing project.**

When the implementation is complete, tell me only that it has been finished. I will test the application myself.
